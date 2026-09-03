"use client";

import {
	ChevronDownIcon,
	ChevronRightIcon,
	GitBranchIcon,
	Plus,
	Trash2Icon,
} from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
	convertQuestionType,
	patchQuestionBase,
	patchQuestionConfig,
	QUESTION_TYPE_CATALOG,
	RATING_SCALES,
	setQuestionOptions,
} from "@/lib/questionnaire-meta";
import { computeQuestionnaireScore } from "@/lib/questionnaire-scoring";
import { useDemoStore } from "@/providers/workflow-store-provider";
import type {
	AnswerOperator,
	BranchActionType,
	ChoiceOptionType,
	QuestionBranchType,
	QuestionItemType,
	QuestionnaireItemType,
	QuestionnaireScoringConfig,
	QuestionnaireSectionType,
	QuestionType,
} from "@/store/questionnaireSlice";

type PtsInputProps = {
	value?: number;
	onCommit: (value: number | undefined) => void;
} & Omit<ComponentProps<"input">, "value" | "onChange">;

//* Small numeric input used for points (score) fields; empty means "not scored".
function PtsInput({ value, onCommit, ...rest }: PtsInputProps) {
	return (
		<Input
			type="number"
			step="1"
			min="0"
			className="h-6 w-16 px-1.5 text-right"
			value={value ?? ""}
			placeholder="—"
			onChange={(e) => {
				const raw = e.target.value;
				onCommit(raw === "" ? undefined : Math.max(0, Number(raw)));
			}}
			{...rest}
		/>
	);
}

function Panel({
	className = "",
	children,
}: {
	className?: string;
	children: ReactNode;
}) {
	return (
		<section
			className={`rounded-lg border border-input/60 bg-card/40 p-3 ${className}`}
		>
			{children}
		</section>
	);
}

//* Question referenced as a branch target (jump/show).
type QuestionTarget = {
	questionUUID: string;
	prompt: string;
};

const OPERATOR_OPTIONS: { value: AnswerOperator; label: string }[] = [
	{ value: "equals", label: "is equal to" },
	{ value: "not_equals", label: "is not equal to" },
	{ value: "contains", label: "contains" },
	{ value: "greater_than", label: "is greater than" },
	{ value: "less_than", label: "is less than" },
	{ value: "is_empty", label: "is empty" },
	{ value: "is_not_empty", label: "is not empty" },
];

//* --- Question editor (common fields + per-type config) ---------------------

function QuestionEditor({
	question,
	questionIndex,
	allQuestions,
	onUpdate,
	onRemove,
}: {
	question: QuestionItemType;
	questionIndex: number;
	allQuestions: QuestionTarget[];
	onUpdate: (next: QuestionItemType) => void;
	onRemove: () => void;
}) {
	const [logicOpen, setLogicOpen] = useState(question.branches.length > 0);

	const onBase = (patch: {
		prompt?: string;
		description?: string;
		required?: boolean;
		score?: number;
	}) => onUpdate(patchQuestionBase(question, patch));

	const onBranchesChange = (branches: QuestionBranchType[]) =>
		onUpdate({ ...question, branches } as QuestionItemType);

	const onConvert = (questionType: QuestionType) =>
		onUpdate(convertQuestionType(question, questionType));

	const renderConfig = () => {
		switch (question.questionType) {
			case "short_text":
			case "long_text":
				return (
					<div className="grid gap-2 sm:grid-cols-2">
						<div className="grid gap-1">
							<Label className="text-xs text-muted-foreground">
								Placeholder
							</Label>
							<Input
								value={question.config.placeholder ?? ""}
								placeholder="Hint shown to the respondent"
								onChange={(e) =>
									onUpdate(
										patchQuestionConfig(question, {
											placeholder: e.target.value,
										}),
									)
								}
							/>
						</div>
						<div className="grid gap-1">
							<Label className="text-xs text-muted-foreground">
								Max. length
							</Label>
							<Input
								type="number"
								min="0"
								value={question.config.maxLength ?? ""}
								placeholder="Unlimited"
								onChange={(e) =>
									onUpdate(
										patchQuestionConfig(question, {
											maxLength:
												e.target.value === ""
													? undefined
													: Math.max(0, Number(e.target.value)),
										}),
									)
								}
							/>
						</div>
					</div>
				);
			case "email":
				return (
					<div className="grid gap-1 sm:max-w-xs">
						<Label className="text-xs text-muted-foreground">Placeholder</Label>
						<Input
							value={question.config.placeholder ?? ""}
							placeholder="you@company.com"
							onChange={(e) =>
								onUpdate(
									patchQuestionConfig(question, {
										placeholder: e.target.value,
									}),
								)
							}
						/>
					</div>
				);
			case "date":
				return null;
			case "yes_no":
				return null;
			case "single_choice":
			case "multiple_choice":
				return (
					<OptionsEditor
						options={question.config.options}
						onChange={(options) =>
							onUpdate(setQuestionOptions(question, options))
						}
					/>
				);
			case "rating":
				return (
					<div className="grid gap-1 sm:max-w-xs">
						<Label className="text-xs text-muted-foreground">Scale</Label>
						<Select
							value={String(question.config.scale ?? 5)}
							onValueChange={(value) =>
								onUpdate(
									patchQuestionConfig(question, {
										scale: Number(value),
									}),
								)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Scale" />
							</SelectTrigger>
							<SelectContent>
								{RATING_SCALES.map((scale) => (
									<SelectItem key={scale} value={String(scale)}>
										{scale} points
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				);
			case "file":
				return null;
		}
	};

	return (
		<Panel className="gap-3">
			{/* Header: index, type, required, points and delete */}
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-xs font-semibold text-muted-foreground">
					Q{questionIndex}
				</span>
				<Select
					value={question.questionType}
					onValueChange={(value) => value && onConvert(value as QuestionType)}
				>
					<SelectTrigger aria-label="Question type">
						<SelectValue placeholder="Type" />
					</SelectTrigger>
					<SelectContent>
						{QUESTION_TYPE_CATALOG.map(({ value, label }) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<div className="flex-1" />

				<Button
					variant={question.required ? "default" : "outline"}
					size="sm"
					onClick={() => onBase({ required: !question.required })}
					aria-pressed={question.required}
				>
					Required
				</Button>
				<div className="flex items-center gap-1.5">
					<Label
						htmlFor={`score-${question.questionUUID}`}
						className="text-xs text-muted-foreground"
					>
						Pts
					</Label>
					<PtsInput
						id={`score-${question.questionUUID}`}
						aria-label="Question points"
						value={question.score}
						onCommit={(value) => onBase({ score: value ?? 0 })}
					/>
				</div>
				<Button
					variant="ghost"
					size="icon"
					onClick={onRemove}
					aria-label="Delete question"
					className="text-destructive hover:text-destructive"
				>
					<Trash2Icon />
				</Button>
			</div>

			{/* Prompt */}
			<Input
				value={question.prompt}
				placeholder="Type the question…"
				onChange={(e) => onBase({ prompt: e.target.value })}
				className="h-8 text-sm font-medium"
			/>

			{/* Optional description */}
			<Textarea
				value={question.description ?? ""}
				placeholder="Optional description / help text"
				rows={2}
				onChange={(e) => onBase({ description: e.target.value })}
			/>

			{renderConfig()}

			{/* Conditional logic (branches) */}
			<div className="flex flex-col gap-2 border-t border-input/60 pt-2">
				<button
					type="button"
					onClick={() => setLogicOpen((open) => !open)}
					aria-expanded={logicOpen}
					className="flex w-fit items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
				>
					{logicOpen ? <ChevronDownIcon /> : <ChevronRightIcon />}
					<GitBranchIcon />
					Conditional logic
					{question.branches.length > 0 && (
						<span className="rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem]">
							{question.branches.length}
						</span>
					)}
				</button>
				{logicOpen && (
					<BranchesEditor
						question={question}
						allQuestions={allQuestions}
						onBranchesChange={onBranchesChange}
					/>
				)}
			</div>
		</Panel>
	);
}

//* --- Options (incisos) editor for choice questions -------------------------

function OptionsEditor({
	options,
	onChange,
}: {
	options: ChoiceOptionType[];
	onChange: (options: ChoiceOptionType[]) => void;
}) {
	const updateOption = (optionUUID: string, patch: Partial<ChoiceOptionType>) =>
		onChange(
			options.map((option) =>
				option.optionUUID === optionUUID ? { ...option, ...patch } : option,
			),
		);

	const addOption = () =>
		onChange([
			...options,
			{ optionUUID: uuidv4(), label: `Option ${options.length + 1}` },
		]);

	const removeOption = (optionUUID: string) =>
		onChange(options.filter((option) => option.optionUUID !== optionUUID));

	return (
		<div className="grid gap-1.5">
			<Label className="text-xs text-muted-foreground">
				Options (each one can award points, i.e. “inciso” score)
			</Label>
			{options.map((option, index) => (
				<div key={option.optionUUID} className="flex items-center gap-1.5">
					<span className="w-5 text-center text-xs text-muted-foreground">
						{index + 1}
					</span>
					<Input
						value={option.label}
						placeholder={`Option ${index + 1}`}
						onChange={(e) =>
							updateOption(option.optionUUID, { label: e.target.value })
						}
						className="flex-1"
					/>
					<PtsInput
						aria-label={`Points of option ${index + 1}`}
						value={option.score}
						onCommit={(value) =>
							updateOption(option.optionUUID, { score: value })
						}
					/>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => removeOption(option.optionUUID)}
						aria-label={`Delete option ${index + 1}`}
						className="text-destructive hover:text-destructive"
					>
						<Trash2Icon />
					</Button>
				</div>
			))}
			<div>
				<Button variant="outline" size="sm" onClick={addOption}>
					<Plus data-icon="inline-start" /> Add option
				</Button>
			</div>
		</div>
	);
}

//* --- Conditional logic (branches) editor -----------------------------------

//* Fresh rule with a sensible default value for the question type.
function createDefaultBranch(question: QuestionItemType): QuestionBranchType {
	let expectedValue: QuestionBranchType["expectedValue"];
	if (question.questionType === "yes_no") {
		expectedValue = true;
	} else if (
		question.questionType === "single_choice" ||
		question.questionType === "multiple_choice"
	) {
		expectedValue = question.config.options[0]?.optionUUID;
	} else if (question.questionType === "rating") {
		expectedValue = 1;
	} else {
		expectedValue = "";
	}

	return {
		branchUUID: uuidv4(),
		operator: "equals",
		expectedValue,
		action: { type: "end_questionnaire" },
	};
}

//* Editor for the expected value, adapted to the question type.
function BranchValueEditor({
	question,
	branch,
	onChange,
}: {
	question: QuestionItemType;
	branch: QuestionBranchType;
	onChange: (patch: Partial<QuestionBranchType>) => void;
}) {
	const needsValue =
		branch.operator !== "is_empty" && branch.operator !== "is_not_empty";
	if (!needsValue) return null;

	if (question.questionType === "yes_no") {
		return (
			<Select
				value={String(branch.expectedValue ?? true)}
				onValueChange={(value) => onChange({ expectedValue: value === "true" })}
			>
				<SelectTrigger size="sm" aria-label="Expected value">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="true">Yes</SelectItem>
					<SelectItem value="false">No</SelectItem>
				</SelectContent>
			</Select>
		);
	}

	if (
		question.questionType === "single_choice" ||
		question.questionType === "multiple_choice"
	) {
		const options = question.config.options;
		return (
			<Select
				value={String(branch.expectedValue ?? options[0]?.optionUUID ?? "")}
				onValueChange={(value) => value && onChange({ expectedValue: value })}
			>
				<SelectTrigger size="sm" aria-label="Expected option">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.optionUUID} value={option.optionUUID}>
							{option.label || "Option"}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		);
	}

	if (question.questionType === "rating") {
		return (
			<PtsInput
				aria-label="Expected rating"
				value={
					typeof branch.expectedValue === "number"
						? branch.expectedValue
						: Number(branch.expectedValue ?? 1)
				}
				onCommit={(value) => onChange({ expectedValue: value ?? 1 })}
			/>
		);
	}

	// Free-text / email / date / file answers use a text comparison value.
	return (
		<Input
			className="h-6 w-32"
			value={
				typeof branch.expectedValue === "string"
					? branch.expectedValue
					: String(branch.expectedValue ?? "")
			}
			placeholder="Value"
			onChange={(event) => onChange({ expectedValue: event.target.value })}
		/>
	);
}

//* List + editor of conditional rules for one question.
function BranchesEditor({
	question,
	allQuestions,
	onBranchesChange,
}: {
	question: QuestionItemType;
	allQuestions: QuestionTarget[];
	onBranchesChange: (branches: QuestionBranchType[]) => void;
}) {
	const branches = question.branches;
	const targets = allQuestions.filter(
		(target) => target.questionUUID !== question.questionUUID,
	);

	const setBranch = (branchUUID: string, patch: Partial<QuestionBranchType>) =>
		onBranchesChange(
			branches.map((branch) =>
				branch.branchUUID === branchUUID ? { ...branch, ...patch } : branch,
			),
		);

	const addBranch = () =>
		onBranchesChange([...branches, createDefaultBranch(question)]);

	const removeBranch = (branchUUID: string) =>
		onBranchesChange(
			branches.filter((branch) => branch.branchUUID !== branchUUID),
		);

	return (
		<div className="flex flex-col gap-2 rounded-md border border-dashed border-input/60 bg-muted/30 p-2">
			{branches.length === 0 && (
				<p className="text-xs text-muted-foreground">
					No rules yet. Add one to make the flow conditional on the answer.
				</p>
			)}

			{branches.map((branch) => {
				const isTargetAction =
					branch.action.type === "jump_to_question" ||
					branch.action.type === "show_question";
				const previousTarget =
					branch.action.type === "jump_to_question" ||
					branch.action.type === "show_question"
						? branch.action.questionUUID
						: "";

				return (
					<div
						key={branch.branchUUID}
						className="flex flex-col gap-1.5 rounded-md border border-input/60 p-2"
					>
						{/* Condition */}
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="text-xs font-medium text-muted-foreground">
								IF answer
							</span>
							<Select
								value={branch.operator}
								onValueChange={(value) =>
									value &&
									setBranch(branch.branchUUID, {
										operator: value as AnswerOperator,
									})
								}
							>
								<SelectTrigger size="sm" aria-label="Operator">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{OPERATOR_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<BranchValueEditor
								question={question}
								branch={branch}
								onChange={(patch) => setBranch(branch.branchUUID, patch)}
							/>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => removeBranch(branch.branchUUID)}
								aria-label="Delete rule"
								className="text-destructive hover:text-destructive"
							>
								<Trash2Icon />
							</Button>
						</div>

						{/* Action */}
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="text-xs font-medium text-muted-foreground">
								THEN
							</span>
							<Select
								value={branch.action.type}
								onValueChange={(value) => {
									const type = value as BranchActionType["type"];
									if (!value) return;
									if (type === "end_questionnaire") {
										setBranch(branch.branchUUID, { action: { type } });
									} else {
										setBranch(branch.branchUUID, {
											action: {
												type,
												questionUUID:
													previousTarget || targets[0]?.questionUUID || "",
											},
										});
									}
								}}
							>
								<SelectTrigger size="sm" aria-label="Action">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="end_questionnaire">
										End questionnaire
									</SelectItem>
									<SelectItem value="jump_to_question">
										Jump to question
									</SelectItem>
									<SelectItem value="show_question">Show question</SelectItem>
								</SelectContent>
							</Select>

							{isTargetAction &&
								(targets.length > 0 ? (
									<Select
										value={previousTarget}
										onValueChange={(value) => {
											if (!value) return;
											const actionType = branch.action.type;
											if (
												actionType === "jump_to_question" ||
												actionType === "show_question"
											) {
												setBranch(branch.branchUUID, {
													action: { type: actionType, questionUUID: value },
												});
											}
										}}
									>
										<SelectTrigger
											size="sm"
											className="max-w-56"
											aria-label="Target question"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{targets.map((target) => (
												<SelectItem
													key={target.questionUUID}
													value={target.questionUUID}
												>
													{target.prompt || "Untitled question"}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								) : (
									<span className="text-xs text-muted-foreground">
										(no other questions)
									</span>
								))}
						</div>
					</div>
				);
			})}

			<Button variant="outline" size="sm" onClick={addBranch}>
				<Plus data-icon="inline-start" /> Add rule
			</Button>
		</div>
	);
}

//* --- Section editor --------------------------------------------------------

function SectionEditor({
	section,
	sectionIndex,
	allQuestions,
	onUpdateSection,
	onRemoveSection,
	onAddQuestion,
	onUpdateQuestion,
	onRemoveQuestion,
}: {
	section: QuestionnaireSectionType;
	sectionIndex: number;
	allQuestions: QuestionTarget[];
	onUpdateSection: (patch: { title?: string; description?: string }) => void;
	onRemoveSection: () => void;
	onAddQuestion: (questionType: QuestionType) => void;
	onUpdateQuestion: (questionUUID: string, next: QuestionItemType) => void;
	onRemoveQuestion: (questionUUID: string) => void;
}) {
	const [draftType, setDraftType] = useState<QuestionType>("single_choice");

	return (
		<Panel className="flex flex-col gap-3">
			<div className="flex items-center gap-2">
				<span className="text-xs font-semibold text-muted-foreground">
					S{sectionIndex}
				</span>
				<Input
					value={section.title ?? ""}
					placeholder="Section title"
					className="h-7 font-medium"
					onChange={(e) => onUpdateSection({ title: e.target.value })}
				/>
				<Button
					variant="ghost"
					size="icon"
					onClick={onRemoveSection}
					aria-label="Delete section"
					className="text-destructive hover:text-destructive"
				>
					<Trash2Icon />
				</Button>
			</div>

			<Textarea
				value={section.description ?? ""}
				placeholder="Optional section description"
				rows={2}
				onChange={(e) => onUpdateSection({ description: e.target.value })}
			/>

			{section.Questions.map((question, index) => (
				<QuestionEditor
					key={question.questionUUID}
					question={question}
					questionIndex={index + 1}
					allQuestions={allQuestions}
					onUpdate={(next) => onUpdateQuestion(question.questionUUID, next)}
					onRemove={() => onRemoveQuestion(question.questionUUID)}
				/>
			))}

			{/* Add question */}
			<div className="flex items-center gap-2">
				<Select
					value={draftType}
					onValueChange={(value) =>
						value && setDraftType(value as QuestionType)
					}
				>
					<SelectTrigger size="sm" aria-label="New question type">
						<SelectValue placeholder="Type" />
					</SelectTrigger>
					<SelectContent>
						{QUESTION_TYPE_CATALOG.map(({ value, label }) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button
					variant="outline"
					size="sm"
					onClick={() => onAddQuestion(draftType)}
				>
					<Plus data-icon="inline-start" /> Add question
				</Button>
			</div>
		</Panel>
	);
}

//* --- Scoring summary -------------------------------------------------------

function ScoringSummary({
	questionnaire,
}: {
	questionnaire: QuestionnaireItemType;
}) {
	const stats = computeQuestionnaireScore(questionnaire, {});
	const scoring = questionnaire.scoring ?? {
		enabled: false,
		passThreshold: 60,
	};

	return (
		<Panel className="sticky top-0 flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold">Scoring</h3>
				<span
					className={`rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${
						scoring.enabled
							? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
							: "bg-muted text-muted-foreground"
					}`}
				>
					{scoring.enabled ? "Enabled" : "Disabled"}
				</span>
			</div>

			<dl className="grid grid-cols-2 gap-2 text-xs">
				<div className="rounded-md bg-muted/60 p-2">
					<dt className="text-muted-foreground">Total points</dt>
					<dd className="text-lg font-semibold">{stats.maxScore}</dd>
				</div>
				<div className="rounded-md bg-muted/60 p-2">
					<dt className="text-muted-foreground">Questions</dt>
					<dd className="text-lg font-semibold">{stats.totalQuestions}</dd>
				</div>
				<div className="rounded-md bg-muted/60 p-2">
					<dt className="text-muted-foreground">Scored questions</dt>
					<dd className="text-lg font-semibold">
						{stats.questions.filter((q) => q.max > 0).length}
					</dd>
				</div>
				<div className="rounded-md bg-muted/60 p-2">
					<dt className="text-muted-foreground">Pass threshold</dt>
					<dd className="text-lg font-semibold">
						{scoring.enabled ? `${scoring.passThreshold}%` : "—"}
					</dd>
				</div>
			</dl>

			<Separator />

			<div className="grid gap-2">
				{stats.sections.map((section) => (
					<div
						key={section.sectionUUID}
						className="flex items-center justify-between text-xs"
					>
						<span className="truncate pr-2 text-muted-foreground">
							{section.title || `Section ${section.total}`}
						</span>
						<span className="font-medium">
							{section.max} pts · {section.total} q
						</span>
					</div>
				))}
				{stats.sections.length === 0 && (
					<p className="text-xs text-muted-foreground">No sections yet.</p>
				)}
			</div>
		</Panel>
	);
}

//* --- Scoring settings editor ----------------------------------------------

function ScoringSettingsEditor({
	questionnaire,
	onChange,
}: {
	questionnaire: QuestionnaireItemType;
	onChange: (patch: Partial<QuestionnaireScoringConfig>) => void;
}) {
	const scoring = questionnaire.scoring ?? {
		enabled: false,
		passThreshold: 60,
	};
	const scoredQuestions = computeQuestionnaireScore(
		questionnaire,
		{},
	).questions.filter((q) => q.max > 0).length;

	return (
		<Panel className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<div className="grid gap-0.5">
					<h3 className="text-sm font-semibold">Scoring settings</h3>
					<p className="text-xs text-muted-foreground">
						Manage how this questionnaire is evaluated.
					</p>
				</div>
				<Button
					variant={scoring.enabled ? "default" : "outline"}
					size="sm"
					onClick={() => onChange({ enabled: !scoring.enabled })}
					aria-pressed={scoring.enabled}
				>
					{scoring.enabled ? "Enabled" : "Disabled"}
				</Button>
			</div>

			{scoring.enabled && (
				<div className="flex items-end gap-3">
					<div className="grid flex-1 gap-1">
						<Label
							htmlFor="pass-threshold"
							className="text-xs text-muted-foreground"
						>
							Pass threshold (%)
						</Label>
						<Input
							id="pass-threshold"
							type="number"
							min="0"
							max="100"
							value={scoring.passThreshold}
							onChange={(e) =>
								onChange({
									passThreshold: Math.min(
										100,
										Math.max(0, Number(e.target.value)),
									),
								})
							}
						/>
					</div>
					<p className="flex-1 pb-1 text-xs text-muted-foreground">
						A respondent passes when their score reaches {scoring.passThreshold}
						% of the total points ({scoredQuestions} scored question
						{scoredQuestions === 1 ? "" : "s"}).
					</p>
				</div>
			)}
		</Panel>
	);
}

//* --- Main builder ----------------------------------------------------------

export default function QuestionnaireBuilder() {
	const CurrentQuestionnaireUUID = useDemoStore(
		(state) => state.CurrentQuestionnaireUUID,
	);
	const questionnaire = useDemoStore(
		(state) => state.Questionnaires[state.CurrentQuestionnaireUUID],
	);
	const {
		updateQuestionnaire,
		addSection,
		removeSection,
		renameSection,
		addQuestion,
		updateQuestion,
		removeQuestion,
		createQuestionnaire,
	} = useDemoStore(
		useShallow((state) => ({
			updateQuestionnaire: state.updateQuestionnaire,
			addSection: state.addSection,
			removeSection: state.removeSection,
			renameSection: state.renameSection,
			addQuestion: state.addQuestion,
			updateQuestion: state.updateQuestion,
			removeQuestion: state.removeQuestion,
			createQuestionnaire: state.createQuestionnaire,
		})),
	);

	if (!questionnaire) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
				<p className="text-sm text-muted-foreground">
					No template selected. Create one to start building.
				</p>
				<Button onClick={createQuestionnaire}>
					<Plus data-icon="inline-start" /> New template
				</Button>
			</div>
		);
	}

	const uuid = CurrentQuestionnaireUUID;
	const allQuestions: QuestionTarget[] = questionnaire.Sections.flatMap(
		(section) =>
			section.Questions.map((question) => ({
				questionUUID: question.questionUUID,
				prompt: question.prompt || "Untitled question",
			})),
	);

	return (
		<div className="flex min-h-0 flex-1 gap-4">
			{/* Left: editable form */}
			<div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
				<Panel className="flex flex-col gap-3">
					<div className="grid gap-2">
						<Label htmlFor="q-name" className="text-xs text-muted-foreground">
							Template name
						</Label>
						<Input
							id="q-name"
							value={questionnaire.name}
							placeholder="Untitled template"
							className="h-9 text-base font-semibold"
							onChange={(e) =>
								updateQuestionnaire(uuid, { name: e.target.value })
							}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="q-desc" className="text-xs text-muted-foreground">
							Description
						</Label>
						<Textarea
							id="q-desc"
							value={questionnaire.description ?? ""}
							placeholder="What is this questionnaire for?"
							rows={3}
							onChange={(e) =>
								updateQuestionnaire(uuid, { description: e.target.value })
							}
						/>
					</div>
				</Panel>

				<ScoringSettingsEditor
					questionnaire={questionnaire}
					onChange={(patch) =>
						updateQuestionnaire(uuid, {
							scoring: {
								enabled:
									patch.enabled ?? questionnaire.scoring?.enabled ?? false,
								passThreshold:
									patch.passThreshold ??
									questionnaire.scoring?.passThreshold ??
									60,
							},
						})
					}
				/>

				{questionnaire.Sections.map((section, index) => (
					<SectionEditor
						key={section.sectionUUID}
						section={section}
						sectionIndex={index + 1}
						allQuestions={allQuestions}
						onUpdateSection={(patch) =>
							renameSection(section.sectionUUID, patch, uuid)
						}
						onRemoveSection={() => removeSection(section.sectionUUID, uuid)}
						onAddQuestion={(questionType) =>
							addQuestion(section.sectionUUID, questionType, uuid)
						}
						onUpdateQuestion={(questionUUID, next) =>
							updateQuestion(questionUUID, next, uuid)
						}
						onRemoveQuestion={(questionUUID) =>
							removeQuestion(questionUUID, uuid)
						}
					/>
				))}

				<div className="flex flex-col items-start gap-2">
					<Button variant="outline" size="sm" onClick={() => addSection(uuid)}>
						<Plus data-icon="inline-start" /> Add section
					</Button>
					<p className="text-xs text-muted-foreground">
						Sections group related questions. Add a scored question by setting
						its points; choice questions can also assign points per option
						(inciso).
					</p>
				</div>
			</div>

			{/* Right: summary */}
			<aside className="hidden w-72 shrink-0 lg:block">
				<ScoringSummary questionnaire={questionnaire} />
			</aside>
		</div>
	);
}
