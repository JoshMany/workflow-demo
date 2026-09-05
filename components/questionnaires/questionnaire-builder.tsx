"use client";

import {
	ArrowDownIcon,
	ArrowUpIcon,
	ChevronDownIcon,
	ChevronRightIcon,
	Copy,
	EyeIcon,
	GitBranchIcon,
	Plus,
	Trash2Icon,
} from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import QuestionnaireSimulator from "./questionnaire-simulator";

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
			className={`flex flex-col gap-3 rounded-xl border border-input/40 bg-card/40 p-4 ${className}`}
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

//* Section that a question can be moved into.
type SectionOption = {
	sectionUUID: string;
	title: string;
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
	canMoveUp,
	canMoveDown,
	moveSections,
	onMoveUp,
	onMoveDown,
	onDuplicate,
	onMoveToSection,
	onUpdate,
	onRemove,
}: {
	question: QuestionItemType;
	questionIndex: number;
	allQuestions: QuestionTarget[];
	canMoveUp: boolean;
	canMoveDown: boolean;
	moveSections: SectionOption[];
	onMoveUp: () => void;
	onMoveDown: () => void;
	onDuplicate: () => void;
	onMoveToSection: (sectionUUID: string) => void;
	onUpdate: (next: QuestionItemType) => void;
	onRemove: () => void;
}) {
	const [logicOpen, setLogicOpen] = useState(question.branches.length > 0);
	const [moveTo, setMoveTo] = useState("");

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
			<div className="flex flex-wrap items-center gap-2.5">
				<span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-muted/70 px-1.5 text-[0.7rem] font-semibold text-muted-foreground">
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
			<div className="grid gap-1.5">
				<Label
					htmlFor={`question-prompt-${question.questionUUID}`}
					className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
				>
					Question
				</Label>
				<Input
					id={`question-prompt-${question.questionUUID}`}
					value={question.prompt}
					placeholder="Type the question…"
					onChange={(e) => onBase({ prompt: e.target.value })}
					className="h-9 text-base font-medium"
				/>
			</div>

			{/* Optional description */}
			<div className="grid gap-1.5">
				<Label
					htmlFor={`question-desc-${question.questionUUID}`}
					className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
				>
					Description
				</Label>
				<Textarea
					id={`question-desc-${question.questionUUID}`}
					value={question.description ?? ""}
					placeholder="Optional description / help text"
					rows={2}
					onChange={(e) => onBase({ description: e.target.value })}
					className="min-h-9 border-transparent bg-transparent px-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
				/>
			</div>

			{renderConfig()}

			{/* Conditional logic (branches) */}
			<div className="flex flex-col gap-2">
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

			{/* Footer tools: order, duplicate, move */}
			<footer className="mt-1 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						disabled={!canMoveUp}
						onClick={onMoveUp}
						aria-label="Move question up"
					>
						<ArrowUpIcon />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						disabled={!canMoveDown}
						onClick={onMoveDown}
						aria-label="Move question down"
					>
						<ArrowDownIcon />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={onDuplicate}
						aria-label="Duplicate question"
					>
						<Copy />
					</Button>
				</div>
				{moveSections.length > 0 && (
					<Select
						value={moveTo}
						onValueChange={(value) => {
							if (!value) return;
							setMoveTo(value);
							onMoveToSection(value);
							setMoveTo("");
						}}
					>
						<SelectTrigger size="sm" aria-label="Move to section">
							<SelectValue placeholder="Move to section…" />
						</SelectTrigger>
						<SelectContent>
							{moveSections.map((section) => (
								<SelectItem
									key={section.sectionUUID}
									value={section.sectionUUID}
								>
									{section.title}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
				<span className="ml-auto text-[0.65rem] text-muted-foreground">
					Order &amp; move
				</span>
			</footer>
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

	const moveOption = (index: number, direction: "up" | "down") => {
		const to = direction === "up" ? index - 1 : index + 1;
		if (to < 0 || to >= options.length) return;
		const next = [...options];
		const [moved] = next.splice(index, 1);
		next.splice(to, 0, moved);
		onChange(next);
	};

	const duplicateOption = (index: number) => {
		const option = options[index];
		onChange([
			...options.slice(0, index + 1),
			{
				...option,
				optionUUID: uuidv4(),
				label: option.label ? `${option.label} (copy)` : option.label,
			},
			...options.slice(index + 1),
		]);
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<Label className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
					Options
				</Label>
				<span className="text-[0.65rem] text-muted-foreground">
					Inciso score = points per option
				</span>
			</div>
			{options.map((option, index) => (
				<div
					key={option.optionUUID}
					className="flex items-center gap-2 rounded-lg bg-muted/30 px-2.5 py-1.5"
				>
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
						size="icon-xs"
						disabled={index === 0}
						onClick={() => moveOption(index, "up")}
						aria-label={`Move option ${index + 1} up`}
					>
						<ArrowUpIcon />
					</Button>
					<Button
						variant="ghost"
						size="icon-xs"
						disabled={index === options.length - 1}
						onClick={() => moveOption(index, "down")}
						aria-label={`Move option ${index + 1} down`}
					>
						<ArrowDownIcon />
					</Button>
					<Button
						variant="ghost"
						size="icon-xs"
						onClick={() => duplicateOption(index)}
						aria-label={`Duplicate option ${index + 1}`}
					>
						<Copy />
					</Button>
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
				<Button
					variant="ghost"
					size="sm"
					onClick={addOption}
					className="text-muted-foreground hover:text-foreground"
				>
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
		<div className="flex flex-col gap-2 border-l-2 border-primary/15 pl-3">
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
						className="flex flex-col gap-2 rounded-lg bg-muted/30 px-3 py-2"
					>
						{/* Condition */}
						<div className="flex flex-wrap items-center gap-1.5">
							<span className="min-w-16 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
								If answer
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
							<span className="min-w-16 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
								Then
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

			<Button variant="ghost" size="sm" onClick={addBranch}>
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
	sections,
	onUpdateSection,
	onRemoveSection,
	onAddQuestion,
	onUpdateQuestion,
	onRemoveQuestion,
	onReorderQuestion,
	onDuplicateQuestion,
	onMoveQuestion,
}: {
	section: QuestionnaireSectionType;
	sectionIndex: number;
	allQuestions: QuestionTarget[];
	sections: SectionOption[];
	onUpdateSection: (patch: { title?: string; description?: string }) => void;
	onRemoveSection: () => void;
	onAddQuestion: (questionType: QuestionType) => void;
	onUpdateQuestion: (questionUUID: string, next: QuestionItemType) => void;
	onRemoveQuestion: (questionUUID: string) => void;
	onReorderQuestion: (
		sectionUUID: string,
		questionUUID: string,
		direction: "up" | "down",
	) => void;
	onDuplicateQuestion: (sectionUUID: string, questionUUID: string) => void;
	onMoveQuestion: (questionUUID: string, toSectionUUID: string) => void;
}) {
	const [draftType, setDraftType] = useState<QuestionType>("single_choice");
	const moveSections = sections.filter(
		(sectionOption) => sectionOption.sectionUUID !== section.sectionUUID,
	);

	return (
		<Panel>
			<div className="flex items-center justify-between gap-2">
				<span className="text-[0.65rem] font-semibold uppercase tracking-widest text-primary/80">
					Section {sectionIndex}
					{section.Questions.length > 0 && (
						<span className="ml-1.5 font-normal normal-case text-muted-foreground">
							· {section.Questions.length} question
							{section.Questions.length === 1 ? "" : "s"}
						</span>
					)}
				</span>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onRemoveSection}
					aria-label="Delete section"
					className="text-destructive hover:text-destructive"
				>
					<Trash2Icon />
				</Button>
			</div>

			<div className="-mt-1 grid gap-2">
				<div className="grid gap-1">
					<Label
						htmlFor={`section-title-${section.sectionUUID}`}
						className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
					>
						Section title
					</Label>
					<Input
						id={`section-title-${section.sectionUUID}`}
						value={section.title ?? ""}
						placeholder="e.g. Candidate Profile"
						className="h-9 border-transparent bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
						onChange={(e) => onUpdateSection({ title: e.target.value })}
					/>
				</div>
				<div className="grid gap-1">
					<Label
						htmlFor={`section-desc-${section.sectionUUID}`}
						className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
					>
						Section description
					</Label>
					<Textarea
						id={`section-desc-${section.sectionUUID}`}
						value={section.description ?? ""}
						placeholder="What is this section about?"
						rows={1}
						onChange={(e) => onUpdateSection({ description: e.target.value })}
						className="min-h-8 resize-none border-transparent bg-transparent px-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
					/>
				</div>
			</div>

			{section.Questions.map((question, index) => {
				const isFirst = index === 0;
				const isLast = index === section.Questions.length - 1;
				return (
					<QuestionEditor
						key={question.questionUUID}
						question={question}
						questionIndex={index + 1}
						allQuestions={allQuestions}
						canMoveUp={!isFirst}
						canMoveDown={!isLast}
						moveSections={moveSections}
						onMoveUp={() =>
							onReorderQuestion(
								section.sectionUUID,
								question.questionUUID,
								"up",
							)
						}
						onMoveDown={() =>
							onReorderQuestion(
								section.sectionUUID,
								question.questionUUID,
								"down",
							)
						}
						onDuplicate={() =>
							onDuplicateQuestion(section.sectionUUID, question.questionUUID)
						}
						onMoveToSection={(toSectionUUID) =>
							onMoveQuestion(question.questionUUID, toSectionUUID)
						}
						onUpdate={(next) => onUpdateQuestion(question.questionUUID, next)}
						onRemove={() => onRemoveQuestion(question.questionUUID)}
					/>
				);
			})}

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
	const [previewOpen, setPreviewOpen] = useState(false);
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
		duplicateQuestion,
		moveQuestion,
		reorderQuestion,
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
			duplicateQuestion: state.duplicateQuestion,
			moveQuestion: state.moveQuestion,
			reorderQuestion: state.reorderQuestion,
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
	const sections: SectionOption[] = questionnaire.Sections.map(
		(section, index) => ({
			sectionUUID: section.sectionUUID,
			title: section.title || `Section ${index + 1}`,
		}),
	);

	return (
		<div className="flex min-h-0 flex-1 gap-3">
			{/* Left: editable form */}
			<div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
				<Panel className="flex flex-col gap-3">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold">Template details</h3>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPreviewOpen(true)}
						>
							<EyeIcon data-icon="inline-start" /> Preview as candidate
						</Button>
					</div>
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
				</Panel>

				<Separator orientation="horizontal" />

				{questionnaire.Sections.map((section, index) => (
					<SectionEditor
						key={section.sectionUUID}
						section={section}
						sectionIndex={index + 1}
						allQuestions={allQuestions}
						sections={sections}
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
						onReorderQuestion={(sectionUUID, questionUUID, direction) =>
							reorderQuestion(sectionUUID, questionUUID, direction, uuid)
						}
						onDuplicateQuestion={(sectionUUID, questionUUID) =>
							duplicateQuestion(sectionUUID, questionUUID, uuid)
						}
						onMoveQuestion={(questionUUID, toSectionUUID) =>
							moveQuestion(questionUUID, toSectionUUID, uuid)
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

			{/* Preview as candidate */}
			<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
				<DialogContent className="sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle>Preview as candidate</DialogTitle>
						<DialogDescription>
							Answer this template the way a candidate would. Nothing is saved.
						</DialogDescription>
					</DialogHeader>
					<div className="flex min-h-0 flex-col">
						<div className="max-h-[min(70vh,40rem)] min-h-0 flex-1 overflow-y-auto">
							<QuestionnaireSimulator questionnaireUUID={uuid} />
						</div>
					</div>
					<DialogFooter>
						<DialogClose render={<Button variant="outline">Close</Button>} />
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
