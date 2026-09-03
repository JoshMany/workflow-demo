import type {
	QuestionBranchType,
	QuestionItemType,
	QuestionnaireItemType,
} from "@/store/questionnaireSlice";
import {
	type FlattenedQuestion,
	flattenQuestionnaire,
} from "./questionnaire-meta";

//* The value a respondent gives per question (keyed by questionUUID).
//* - string: short_text / long_text / email / date
//* - string[]: selected optionUUIDs (single_choice / multiple_choice / file names)
//* - number: rating (1..scale)
//* - boolean: yes_no
export type AnswerValue = string | string[] | number | boolean | undefined;
export type Answers = Record<string, AnswerValue>;

export function isAnswered(answer: AnswerValue): boolean {
	if (answer === undefined || answer === null) return false;
	if (typeof answer === "string") return answer.trim().length > 0;
	if (Array.isArray(answer)) return answer.length > 0;
	return true; // boolean or number were explicitly provided
}

//* Option scores of a choice question (empty for non-choice types).
function getChoiceOptionScores(question: QuestionItemType): number[] {
	if (
		question.questionType === "single_choice" ||
		question.questionType === "multiple_choice"
	) {
		return question.config.options.map((option) => option.score ?? 0);
	}
	return [];
}

//* Maximum points a question can award (by option weights or its own score).
export function getQuestionMaxScore(question: QuestionItemType): number {
	const scores = getChoiceOptionScores(question);
	if (scores.length > 0 && scores.some((score) => score > 0)) {
		return question.questionType === "multiple_choice"
			? scores.reduce((sum, score) => sum + Math.max(0, score), 0)
			: Math.max(0, ...scores);
	}
	return Math.max(0, question.score);
}

//* Points earned by a question given the respondent's answer.
export function getQuestionEarnedScore(
	question: QuestionItemType,
	answer: AnswerValue,
): number {
	if (!isAnswered(answer)) return 0;

	const scores = getChoiceOptionScores(question);
	const anyOptionScored = scores.some((score) => score > 0);

	switch (question.questionType) {
		case "single_choice": {
			const chosen = Array.isArray(answer) ? answer[0] : answer;
			if (anyOptionScored) {
				const option = question.config.options.find(
					(opt) => opt.optionUUID === chosen,
				);
				return option?.score ?? 0;
			}
			return Math.max(0, question.score);
		}
		case "multiple_choice": {
			const chosen = Array.isArray(answer) ? answer : [];
			if (anyOptionScored) {
				return question.config.options
					.filter((opt) => chosen.includes(opt.optionUUID))
					.reduce((sum, opt) => sum + (opt.score ?? 0), 0);
			}
			return Math.max(0, question.score);
		}
		case "rating": {
			const value = typeof answer === "number" ? answer : Number(answer);
			const scale = question.config.scale || 5;
			if (!Number.isFinite(value) || scale <= 0) return 0;
			const clamped = Math.max(1, Math.min(value, scale));
			return Math.round((clamped / scale) * Math.max(0, question.score));
		}
		case "yes_no":
			return Math.max(0, question.score);
		default:
			// free text / email / date / file: full score when answered
			return Math.max(0, question.score);
	}
}

export type QuestionScoreResult = FlattenedQuestion & {
	answered: boolean;
	max: number;
	earned: number;
};

export type SectionScoreResult = {
	sectionUUID: string;
	title?: string;
	max: number;
	earned: number;
	answered: number;
	total: number;
};

export type QuestionnaireScoreResult = {
	maxScore: number;
	earnedScore: number;
	percentage: number | null;
	passed: boolean | null;
	answeredQuestions: number;
	totalQuestions: number;
	questions: QuestionScoreResult[];
	sections: SectionScoreResult[];
};

//* Evaluates the whole questionnaire for a set of answers.
export function computeQuestionnaireScore(
	questionnaire: QuestionnaireItemType,
	answers: Answers,
): QuestionnaireScoreResult {
	const questions: QuestionScoreResult[] = flattenQuestionnaire(
		questionnaire,
	).map((entry) => ({
		...entry,
		answered: isAnswered(answers[entry.questionUUID]),
		max: getQuestionMaxScore(entry.question),
		earned: getQuestionEarnedScore(entry.question, answers[entry.questionUUID]),
	}));

	const totalQuestions = questions.length;
	const answeredQuestions = questions.filter((q) => q.answered).length;
	const maxScore = questions.reduce((sum, q) => sum + q.max, 0);
	const earnedScore = questions.reduce((sum, q) => sum + q.earned, 0);
	const percentage =
		maxScore > 0 ? Math.round((earnedScore / maxScore) * 1000) / 10 : null;

	const sections: SectionScoreResult[] = questionnaire.Sections.map(
		(section) => {
			const sectionQuestions = questions.filter(
				(q) => q.sectionUUID === section.sectionUUID,
			);
			return {
				sectionUUID: section.sectionUUID,
				title: section.title,
				max: sectionQuestions.reduce((sum, q) => sum + q.max, 0),
				earned: sectionQuestions.reduce((sum, q) => sum + q.earned, 0),
				answered: sectionQuestions.filter((q) => q.answered).length,
				total: sectionQuestions.length,
			};
		},
	);

	const threshold = questionnaire.scoring?.enabled
		? questionnaire.scoring.passThreshold
		: null;
	const passed =
		percentage !== null && threshold !== null ? percentage >= threshold : null;

	return {
		maxScore,
		earnedScore,
		percentage,
		passed,
		answeredQuestions,
		totalQuestions,
		questions,
		sections,
	};
}

//* --- Branch condition matching -------------------------------------------

function normalizeBoolean(
	value: AnswerValue | string | number | boolean,
): boolean {
	return value === true || value === "true" || value === 1 || value === "1";
}

function compareEquals(
	answer: AnswerValue,
	expected: string | number | boolean | undefined,
): boolean {
	if (answer === undefined || answer === null || expected === undefined) {
		return false;
	}
	if (typeof expected === "boolean") {
		return normalizeBoolean(answer) === expected;
	}
	if (typeof expected === "number") {
		return Number(answer) === expected;
	}
	if (Array.isArray(answer)) {
		return answer.includes(String(expected));
	}
	return String(answer).toLowerCase() === String(expected).toLowerCase();
}

function compareContains(
	answer: AnswerValue,
	expected: string | number | boolean | undefined,
): boolean {
	if (answer === undefined || answer === null) return false;
	const needle = String(expected ?? "").toLowerCase();
	if (Array.isArray(answer)) {
		return answer.some((value) => String(value).toLowerCase().includes(needle));
	}
	return String(answer).toLowerCase().includes(needle);
}

function compareNumeric(
	answer: AnswerValue,
	expected: string | number | boolean | undefined,
): -1 | 0 | 1 {
	const a = Number(answer);
	const e = Number(expected);
	if (!Number.isFinite(a) || !Number.isFinite(e)) return 0;
	return a > e ? 1 : a < e ? -1 : 0;
}

//* Whether an answer satisfies a branch condition.
export function answerMatchesBranch(
	branch: QuestionBranchType,
	answer: AnswerValue,
): boolean {
	const expected = branch.expectedValue;
	switch (branch.operator) {
		case "is_empty":
			return !isAnswered(answer);
		case "is_not_empty":
			return isAnswered(answer);
		case "not_equals":
			return !compareEquals(answer, expected);
		case "equals":
			return compareEquals(answer, expected);
		case "contains":
			return compareContains(answer, expected);
		case "greater_than":
			return compareNumeric(answer, expected) === 1;
		case "less_than":
			return compareNumeric(answer, expected) === -1;
	}
}

//* First branch of a question whose condition matches the given answer.
export function evaluateQuestionBranches(
	question: QuestionItemType,
	answers: Answers,
): QuestionBranchType | undefined {
	for (const branch of question.branches) {
		if (answerMatchesBranch(branch, answers[question.questionUUID])) {
			return branch;
		}
	}
	return undefined;
}
