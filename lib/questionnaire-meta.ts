import {
	type BaseQuestionData,
	type ChoiceOptionType,
	createDefaultQuestion,
	type QuestionItemType,
	type QuestionnaireItemType,
	type QuestionnaireScoringConfig,
	type QuestionType,
} from "@/store/questionnaireSlice";

//* Ordered catalogue of question types (for selects / menus / add buttons).
export const QUESTION_TYPE_CATALOG: { value: QuestionType; label: string }[] = [
	{ value: "short_text", label: "Short text" },
	{ value: "long_text", label: "Long text" },
	{ value: "email", label: "Email" },
	{ value: "date", label: "Date" },
	{ value: "yes_no", label: "Yes / No" },
	{ value: "single_choice", label: "Single choice" },
	{ value: "multiple_choice", label: "Multiple choice" },
	{ value: "rating", label: "Rating scale" },
	{ value: "file", label: "File upload" },
];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> =
	Object.fromEntries(
		QUESTION_TYPE_CATALOG.map(({ value, label }) => [value, label]),
	) as Record<QuestionType, string>;

export const RATING_SCALES = [3, 5, 7, 10];

export const DEFAULT_SCORING: QuestionnaireScoringConfig = {
	enabled: false,
	passThreshold: 60,
};

//* Fields that are shared by every question type (editable from the builder).
export type EditableQuestionBase = Pick<
	BaseQuestionData,
	"prompt" | "description" | "required" | "score"
>;

//* Apply a patch to the common (base) fields of a question, preserving type/config.
export function patchQuestionBase(
	question: QuestionItemType,
	patch: Partial<EditableQuestionBase>,
): QuestionItemType {
	return { ...question, ...patch };
}

//* Generic patch of the per-type config (type-unsafe by design; use the typed
//* helpers below when you know the shape you are writing).
export function patchQuestionConfig(
	question: QuestionItemType,
	patch: Record<string, unknown>,
): QuestionItemType {
	return {
		...question,
		config: { ...question.config, ...patch },
	} as QuestionItemType;
}

//* Replace the options of a choice question (no-op for other types).
export function setQuestionOptions(
	question: QuestionItemType,
	options: ChoiceOptionType[],
): QuestionItemType {
	if (
		question.questionType === "single_choice" ||
		question.questionType === "multiple_choice"
	) {
		return { ...question, config: { ...question.config, options } };
	}
	return question;
}

//* Whether a question renders a list of selectable options (incisos).
export function hasOptions(question: QuestionItemType): boolean {
	return (
		question.questionType === "single_choice" ||
		question.questionType === "multiple_choice"
	);
}

//* Switch the type of a question preserving its identity and base fields.
//* The config is replaced by the defaults of the new type.
export function convertQuestionType(
	question: QuestionItemType,
	questionType: QuestionType,
): QuestionItemType {
	if (question.questionType === questionType) return question;

	const fresh = createDefaultQuestion(questionType);
	return {
		...fresh,
		questionUUID: question.questionUUID,
		prompt: question.prompt,
		description: question.description,
		required: question.required,
		score: question.score,
		branches: question.branches,
	};
}

export type FlattenedQuestion = {
	questionUUID: string;
	sectionUUID: string;
	sectionTitle?: string;
	question: QuestionItemType;
};

//* Flattens sections/questions preserving the visible order.
export function flattenQuestionnaire(
	questionnaire: QuestionnaireItemType,
): FlattenedQuestion[] {
	return questionnaire.Sections.flatMap((section) =>
		section.Questions.map((question) => ({
			questionUUID: question.questionUUID,
			sectionUUID: section.sectionUUID,
			sectionTitle: section.title,
			question,
		})),
	);
}
