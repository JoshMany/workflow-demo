"use client";

import {
	Questionnaire,
	type QuestionnaireItemStatus,
} from "@shadcn/react/questionnaire";
import { CheckCircle2Icon, RotateCcwIcon, XCircleIcon } from "lucide-react";
import { type FormEvent, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { buttonVariants } from "@/components/ui/button";
import {
	type FlattenedQuestion,
	flattenQuestionnaire,
} from "@/lib/questionnaire-meta";
import {
	type Answers,
	type AnswerValue,
	computeQuestionnaireScore,
	evaluateQuestionBranches,
} from "@/lib/questionnaire-scoring";
import { cn } from "@/lib/utils";
import { useDemoStore } from "@/providers/workflow-store-provider";
import type { QuestionItemType } from "@/store/questionnaireSlice";

const inputClassName =
	"h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 md:text-xs/relaxed dark:bg-input/30";

const choiceRowClassName =
	"group flex items-center gap-2 rounded-md border border-input/60 bg-transparent px-3 py-2 text-sm transition-colors cursor-pointer select-none outline-none data-[checked]:border-primary data-[checked]:bg-primary/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/40";

//* Placeholder shown by freeform answer inputs (per question type).
function freeformPlaceholder(question: QuestionItemType): string {
	switch (question.questionType) {
		case "short_text":
		case "long_text":
			return question.config.placeholder ?? "Your answer";
		case "email":
			return question.config.placeholder ?? "you@company.com";
		case "file":
			return "File name (upload is simulated)";
		default:
			return "Your answer";
	}
}

//* Visual (radio/checkbox) indicator driven by the parent's data-checked state.
function ChoiceIndicator({ multiple = false }: { multiple?: boolean }) {
	return (
		<span
			aria-hidden
			className={cn(
				"flex size-4 shrink-0 items-center justify-center rounded-full border border-input transition-colors group-data-[checked]:border-primary",
				multiple ? "rounded-[4px]" : "rounded-full",
			)}
		>
			<span className="size-1.5 rounded-full bg-primary opacity-0 transition-opacity group-data-[checked]:opacity-100" />
		</span>
	);
}

function formatAnswer(question: QuestionItemType, answer: AnswerValue): string {
	if (answer === undefined) return "—";
	if (typeof answer === "boolean") return answer ? "Yes" : "No";
	if (typeof answer === "number") return String(answer);
	if (
		(question.questionType === "single_choice" ||
			question.questionType === "multiple_choice") &&
		Array.isArray(answer)
	) {
		const labels = Object.fromEntries(
			question.config.options.map((option) => [
				option.optionUUID,
				option.label,
			]),
		);
		return answer.map((id) => labels[id] ?? id).join(", ");
	}
	if (Array.isArray(answer)) return answer.join(", ");
	return answer;
}

//* Renders the answer controls of one question inside a Questionnaire.Item.
//* Choice questions map to native radios/checkboxes; the rest use a freeform
//* input (long text and file uploads are simulated with a text field because
//* the primitive does not expose textarea/file controls).
function AnswerControls({ entry }: { entry: FlattenedQuestion }) {
	const { question } = entry;

	if (
		question.questionType === "single_choice" ||
		question.questionType === "multiple_choice"
	) {
		const multiple = question.questionType === "multiple_choice";
		return (
			<Questionnaire.Choices className="flex flex-col gap-1.5">
				{question.config.options.map((option) => (
					<Questionnaire.Choice
						key={option.optionUUID}
						value={option.optionUUID}
						className={choiceRowClassName}
					>
						<Questionnaire.ChoiceInput className="sr-only" />
						<ChoiceIndicator multiple={multiple} />
						<Questionnaire.ChoiceLabel>
							{option.label}
						</Questionnaire.ChoiceLabel>
					</Questionnaire.Choice>
				))}
				{multiple && (
					<p className="text-xs text-muted-foreground">
						Select all that apply.
					</p>
				)}
			</Questionnaire.Choices>
		);
	}

	if (question.questionType === "yes_no") {
		return (
			<Questionnaire.Choices className="flex flex-col gap-1.5 sm:flex-row">
				{(["yes", "no"] as const).map((value) => (
					<Questionnaire.Choice
						key={value}
						value={value}
						className={cn(choiceRowClassName, "flex-1")}
					>
						<Questionnaire.ChoiceInput className="sr-only" />
						<ChoiceIndicator />
						<Questionnaire.ChoiceLabel className="capitalize">
							{value}
						</Questionnaire.ChoiceLabel>
					</Questionnaire.Choice>
				))}
			</Questionnaire.Choices>
		);
	}

	if (question.questionType === "rating") {
		const scale = Math.max(2, question.config.scale ?? 5);
		return (
			<Questionnaire.Choices className="flex flex-col gap-1.5 sm:flex-row">
				{Array.from({ length: scale }, (_, i) => String(i + 1)).map((value) => (
					<Questionnaire.Choice
						key={value}
						value={value}
						className={cn(choiceRowClassName, "flex-1 justify-center")}
					>
						<Questionnaire.ChoiceInput className="sr-only" />
						<Questionnaire.ChoiceLabel>{value}</Questionnaire.ChoiceLabel>
					</Questionnaire.Choice>
				))}
			</Questionnaire.Choices>
		);
	}

	const type =
		question.questionType === "email"
			? "email"
			: question.questionType === "date"
				? "date"
				: "text";

	return (
		<Questionnaire.Choices className="flex flex-col gap-1.5">
			<Questionnaire.Input
				type={type}
				className={inputClassName}
				aria-label={question.prompt || "Answer"}
				placeholder={freeformPlaceholder(question)}
			/>
			{question.questionType === "file" && (
				<p className="text-xs text-muted-foreground">
					File uploads are simulated in this preview.
				</p>
			)}
			{question.questionType === "long_text" && (
				<p className="text-xs text-muted-foreground">
					Long answers are entered in a single line in this preview.
				</p>
			)}
		</Questionnaire.Choices>
	);
}

//* Results screen ------------------------------------------------------------

function ResultsView({
	questionnaireUUID,
	answers,
	onRestart,
}: {
	questionnaireUUID: string;
	answers: Answers;
	onRestart: () => void;
}) {
	const questionnaire = useDemoStore(
		(state) => state.Questionnaires[questionnaireUUID],
	);
	const result = useMemo(
		() =>
			questionnaire ? computeQuestionnaireScore(questionnaire, answers) : null,
		[questionnaire, answers],
	);

	if (!questionnaire || !result) return null;

	const scoringEnabled = questionnaire.scoring?.enabled ?? false;
	const answeredAll = result.answeredQuestions === result.totalQuestions;

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-2">
			<div className="flex flex-col items-center gap-2 text-center">
				<h2 className="text-lg font-semibold">Simulation results</h2>
				<p className="text-sm text-muted-foreground">
					{questionnaire.name}
					{!answeredAll &&
						` · ${result.totalQuestions - result.answeredQuestions} question(s) left blank`}
				</p>
			</div>

			{scoringEnabled && result.maxScore > 0 && (
				<div className="flex flex-col items-center gap-2 rounded-lg border border-input/60 bg-card/40 p-6">
					<div className="flex items-center gap-2 text-2xl font-bold">
						{result.passed === null ? null : result.passed ? (
							<CheckCircle2Icon className="size-6 text-emerald-500" />
						) : (
							<XCircleIcon className="size-6 text-destructive" />
						)}
						{result.earnedScore} / {result.maxScore}
					</div>
					<div className="text-sm text-muted-foreground">
						{result.percentage}% · threshold{" "}
						{questionnaire.scoring?.passThreshold}%
					</div>
					<span
						className={`rounded-full px-3 py-1 text-xs font-semibold ${
							result.passed === null
								? "bg-muted text-muted-foreground"
								: result.passed
									? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
									: "bg-destructive/10 text-destructive"
						}`}
					>
						{result.passed === null
							? "No threshold"
							: result.passed
								? "Passed"
								: "Not passed"}
					</span>
				</div>
			)}

			<div className="grid gap-2">
				{result.sections.map((section) => (
					<div
						key={section.sectionUUID}
						className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs"
					>
						<span className="font-medium">{section.title || "Section"}</span>
						<span className="text-muted-foreground">
							{scoringEnabled ? `${section.earned}/${section.max} pts · ` : ""}
							{section.answered}/{section.total} answered
						</span>
					</div>
				))}
			</div>

			<div className="grid gap-2">
				<h3 className="text-sm font-semibold">Answer review</h3>
				{result.questions.map(({ question, answered, max, earned }) => (
					<div
						key={question.questionUUID}
						className="rounded-lg border border-input/60 bg-card/40 p-3 text-sm"
					>
						<div className="flex items-start justify-between gap-2">
							<span className="font-medium">
								{question.prompt || "Untitled question"}
							</span>
							{scoringEnabled && (
								<span className="shrink-0 text-xs text-muted-foreground">
									{answered ? `${earned}/${max}` : "—"}
								</span>
							)}
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{formatAnswer(question, answers[question.questionUUID])}
						</p>
					</div>
				))}
			</div>

			<button
				type="button"
				onClick={onRestart}
				className={cn(buttonVariants({ variant: "outline" }))}
			>
				<RotateCcwIcon data-icon="inline-start" /> Simulate again
			</button>
		</div>
	);
}

//* Main simulator container --------------------------------------------------
//* The respondent flow is powered by the shadcn Questionnaire primitive
//* (progress, validation, keyboard nav, skip and focus management come free).
//* Branch rules from the template data (end/jump) are applied with controlled
//* navigation, and the final score is computed from the native FormData.

export default function QuestionnaireSimulator({
	questionnaireUUID,
}: {
	questionnaireUUID: string;
}) {
	const questionnaire = useDemoStore(
		(state) => state.Questionnaires[questionnaireUUID],
	);
	const { createQuestionnaire } = useDemoStore(
		useShallow((state) => ({ createQuestionnaire: state.createQuestionnaire })),
	);

	const formRef = useRef<HTMLFormElement | null>(null);
	const [runId, setRunId] = useState(0);
	const [answers, setAnswers] = useState<Answers>({});
	const [statuses, setStatuses] = useState<
		Record<string, QuestionnaireItemStatus>
	>({});
	const [activeName, setActiveName] = useState<string | undefined>(undefined);
	const [finished, setFinished] = useState(false);

	const flat = useMemo(
		() => (questionnaire ? flattenQuestionnaire(questionnaire) : []),
		[questionnaire],
	);

	const restart = () => {
		setAnswers({});
		setStatuses({});
		setActiveName(undefined);
		setFinished(false);
		setRunId((id) => id + 1);
	};

	//* Reads the current native form and maps raw values back to typed answers
	//* (boolean for yes_no, number for rating, arrays for choices).
	const readAnswers = (): Answers => {
		const form = formRef.current;
		if (!form) return answers;

		const next: Answers = {};
		for (const entry of flat) {
			const name = entry.questionUUID;
			const node = form.elements.namedItem(name);
			if (!node) continue;

			if (node instanceof RadioNodeList) {
				const values: string[] = [];
				for (let i = 0; i < node.length; i += 1) {
					const element = node[i] as HTMLInputElement;
					if (element.checked) values.push(element.value);
				}
				if (values.length === 0) continue;

				switch (entry.question.questionType) {
					case "yes_no":
						next[name] = values[0] === "yes";
						break;
					case "rating":
						next[name] = Number(values[0]);
						break;
					case "single_choice":
					case "multiple_choice":
						next[name] = values;
						break;
					default:
						next[name] = values[0];
				}
			} else if (node instanceof HTMLInputElement) {
				const value = node.value.trim();
				if (value) next[name] = value;
			}
		}
		return next;
	};

	if (!questionnaire) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
				<p className="text-sm text-muted-foreground">
					No template selected. Create one to simulate it.
				</p>
				<button
					type="button"
					onClick={createQuestionnaire}
					className={cn(buttonVariants())}
				>
					New template
				</button>
			</div>
		);
	}

	if (finished) {
		return (
			<ResultsView
				questionnaireUUID={questionnaireUUID}
				answers={answers}
				onRestart={restart}
			/>
		);
	}

	if (flat.length === 0) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
				<p className="text-sm text-muted-foreground">
					This template has no questions yet. Add some in the builder.
				</p>
				<button
					type="button"
					onClick={restart}
					className={cn(buttonVariants({ variant: "outline" }))}
				>
					Reset
				</button>
			</div>
		);
	}

	const activeIndex = activeName
		? Math.max(
				0,
				flat.findIndex((f) => f.questionUUID === activeName),
			)
		: 0;
	const currentActive = flat[Math.min(activeIndex, flat.length - 1)];

	const answeredCount = flat.filter(
		(f) => statuses[f.questionUUID] === "answered",
	).length;

	const finishWithAnswers = () => {
		setAnswers(readAnswers());
		setFinished(true);
	};

	const handleItemChange = (requested: string) => {
		const requestedIndex = flat.findIndex((f) => f.questionUUID === requested);
		// Only evaluate branches when moving FORWARD (leaving the current item
		// through Next). Backward navigation is always allowed.
		if (requestedIndex > activeIndex) {
			const freshAnswers = readAnswers();
			const branch = evaluateQuestionBranches(
				currentActive.question,
				freshAnswers,
			);
			if (branch) {
				switch (branch.action.type) {
					case "end_questionnaire":
						setAnswers(freshAnswers);
						setFinished(true);
						return;
					// Both "jump" and "show" navigate the flow to the target
					// question (forward or backward) once the rule matches.
					case "jump_to_question":
					case "show_question": {
						const targetQuestionUUID = branch.action.questionUUID;
						const targetIndex = flat.findIndex(
							(f) => f.questionUUID === targetQuestionUUID,
						);
						if (targetIndex >= 0 && targetIndex !== activeIndex) {
							setAnswers(freshAnswers);
							setActiveName(flat[targetIndex].questionUUID);
							return;
						}
						break;
					}
				}
			}
		}
		setActiveName(requested);
	};

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		finishWithAnswers();
	};

	const handleStatusChange = (
		name: string,
		status: QuestionnaireItemStatus,
	) => {
		setStatuses((prev) => ({ ...prev, [name]: status }));
	};

	return (
		<Questionnaire.Root
			key={runId}
			ref={formRef}
			item={currentActive.questionUUID}
			onItemChange={handleItemChange}
			onSubmit={handleSubmit}
			className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 overflow-y-auto py-2"
		>
			{/* Progress */}
			<div className="flex items-center justify-between text-xs text-muted-foreground">
				<Questionnaire.Progress aria-label="Questionnaire progress" />
				<span>
					{answeredCount}/{flat.length} answered
				</span>
			</div>
			<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
				<div
					className="h-full rounded-full bg-primary transition-all"
					style={{ width: `${(answeredCount / flat.length) * 100}%` }}
				/>
			</div>

			{flat.map((entry, index) => {
				const startsSection =
					index === 0 || flat[index - 1].sectionUUID !== entry.sectionUUID;
				return (
					<Questionnaire.Item
						key={entry.questionUUID}
						name={entry.questionUUID}
						required={entry.question.required}
						multiple={entry.question.questionType === "multiple_choice"}
						onStatusChange={(status) =>
							handleStatusChange(entry.questionUUID, status)
						}
						className="flex flex-col gap-3 rounded-lg border border-input/60 bg-card/40 p-4"
					>
						{startsSection && (
							<div className="-mx-1 flex flex-col gap-0.5 border-l-2 border-primary pl-2.5">
								<p className="text-xs font-semibold text-muted-foreground">
									{entry.sectionTitle || "Section"}
								</p>
								{questionnaire.Sections.find(
									(s) => s.sectionUUID === entry.sectionUUID,
								)?.description && (
									<p className="text-xs text-muted-foreground">
										{
											questionnaire.Sections.find(
												(s) => s.sectionUUID === entry.sectionUUID,
											)?.description
										}
									</p>
								)}
							</div>
						)}
						<Questionnaire.Title className="text-sm font-medium">
							{entry.question.prompt || "Untitled question"}
							{entry.question.required && (
								<span className="ml-1 text-destructive">*</span>
							)}
							{questionnaire.scoring?.enabled && entry.question.score > 0 && (
								<span className="ml-2 rounded-full bg-muted px-2 py-0.5 align-middle text-[0.65rem] font-medium text-muted-foreground">
									{entry.question.score} pts
								</span>
							)}
						</Questionnaire.Title>
						{entry.question.description && (
							<Questionnaire.Description className="text-xs text-muted-foreground">
								{entry.question.description}
							</Questionnaire.Description>
						)}
						<AnswerControls entry={entry} />
						<Questionnaire.Error className="text-xs font-medium text-destructive">
							Please answer this question before continuing.
						</Questionnaire.Error>
					</Questionnaire.Item>
				);
			})}

			{/* Navigation actions */}
			<div className="flex items-center justify-between pt-1">
				<Questionnaire.Previous
					className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
				>
					Back
				</Questionnaire.Previous>
				<div className="flex items-center gap-2">
					<Questionnaire.Skip
						className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
					>
						Skip
					</Questionnaire.Skip>
					<Questionnaire.Next className={cn(buttonVariants({ size: "sm" }))}>
						Next
					</Questionnaire.Next>
					<Questionnaire.Submit className={cn(buttonVariants({ size: "sm" }))}>
						Submit
					</Questionnaire.Submit>
				</div>
			</div>
		</Questionnaire.Root>
	);
}
