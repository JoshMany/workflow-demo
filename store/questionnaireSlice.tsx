import { v4 as uuidv4 } from "uuid";
import type { StateCreator } from "zustand";
import type { DemoStore } from "./demoStore";

//* Supported question types (full set for a questionnaire builder)
export type QuestionType =
	| "short_text"
	| "long_text"
	| "email"
	| "date"
	| "yes_no"
	| "single_choice"
	| "multiple_choice"
	| "rating"
	| "file";

//* Answer operators used to build conditional branches
export type AnswerOperator =
	| "equals"
	| "not_equals"
	| "contains"
	| "greater_than"
	| "less_than"
	| "is_empty"
	| "is_not_empty";

//* What happens when a branch condition matches
export type BranchActionType =
	| { type: "jump_to_question"; questionUUID: string }
	| { type: "show_question"; questionUUID: string }
	| { type: "end_questionnaire" };

export type QuestionBranchType = {
	branchUUID: string;
	operator: AnswerOperator;
	expectedValue?: string | number | boolean;
	action: BranchActionType;
};

export type ChoiceOptionType = {
	optionUUID: string;
	label: string;
	//* Points ("inciso") this option awards when selected. Optional: when options
	//* define a score, the question is scored by the chosen option(s); otherwise
	//* the question falls back to its own `score`.
	score?: number;
};

//* Questionnaire-level scoring settings (percentage threshold to pass).
export type QuestionnaireScoringConfig = {
	//* Whether the questionnaire is scored at all.
	enabled: boolean;
	//* Minimum percentage (0-100) of points required to pass.
	passThreshold: number;
};

//* Per-type config (mirrors ActionConfigMap pattern from flowSlice)
export type QuestionConfigMap = {
	short_text: { placeholder?: string; maxLength?: number };
	long_text: { placeholder?: string; maxLength?: number };
	email: { placeholder?: string };
	date: Record<string, never>;
	yes_no: Record<string, never>;
	single_choice: { options: ChoiceOptionType[] };
	multiple_choice: { options: ChoiceOptionType[] };
	rating: { scale: number };
	file: { accept?: string[]; maxSizeMB?: number };
};

export type BaseQuestionData = {
	questionUUID: string;
	prompt: string;
	description?: string;
	required: boolean;
	//* Points this question contributes to the questionnaire score (0 = not scored)
	score: number;
	branches: QuestionBranchType[];
};

export type QuestionItemType = {
	[K in keyof QuestionConfigMap]: BaseQuestionData & {
		questionType: K;
		config: QuestionConfigMap[K];
	};
}[keyof QuestionConfigMap];

export type QuestionnaireSectionType = {
	sectionUUID: string;
	title?: string;
	description?: string;
	Questions: QuestionItemType[];
};

export type QuestionnaireItemType = {
	name: string;
	description?: string;
	scoring?: QuestionnaireScoringConfig;
	Sections: QuestionnaireSectionType[];
};

export interface QuestionnaireStoreStates {
	Questionnaires: Record<string, QuestionnaireItemType>;
	CurrentQuestionnaireUUID: string;
}

export interface QuestionnaireStoreActions {
	//* Questionnaire lifecycle
	createQuestionnaire: () => void;
	removeQuestionnaire: (questionnaireUUID: string) => void;
	restoreQuestionnaire: (
		questionnaireUUID: string,
		item: QuestionnaireItemType,
		index?: number,
	) => void;
	selectQuestionnaire: (questionnaireUUID: string) => void;
	renameQuestionnaire: (questionnaireUUID: string, name: string) => void;
	duplicateQuestionnaire: (questionnaireUUID: string) => void;
	updateQuestionnaire: (
		questionnaireUUID: string,
		patch: {
			name?: string;
			description?: string;
			scoring?: QuestionnaireScoringConfig;
		},
	) => void;

	//* Sections
	addSection: (questionnaireUUID?: string) => void;
	removeSection: (sectionUUID: string, questionnaireUUID?: string) => void;
	renameSection: (
		sectionUUID: string,
		patch: { title?: string; description?: string },
		questionnaireUUID?: string,
	) => void;

	//* Questions
	addQuestion: (
		sectionUUID: string,
		questionType: QuestionType,
		questionnaireUUID?: string,
	) => void;
	updateQuestion: (
		questionUUID: string,
		nextQuestion: QuestionItemType,
		questionnaireUUID?: string,
	) => void;
	removeQuestion: (questionUUID: string, questionnaireUUID?: string) => void;

	//* Question organization (reorder / move / duplicate)
	duplicateQuestion: (
		sectionUUID: string,
		questionUUID: string,
		questionnaireUUID?: string,
	) => void;
	moveQuestion: (
		questionUUID: string,
		toSectionUUID: string,
		questionnaireUUID?: string,
	) => void;
	reorderQuestion: (
		sectionUUID: string,
		questionUUID: string,
		direction: "up" | "down",
		questionnaireUUID?: string,
	) => void;

	//* Conditional branches
	setQuestionBranches: (
		questionUUID: string,
		branches: QuestionBranchType[],
		questionnaireUUID?: string,
	) => void;
	addBranch: (
		questionUUID: string,
		branch: QuestionBranchType,
		questionnaireUUID?: string,
	) => void;
	removeBranch: (
		questionUUID: string,
		branchUUID: string,
		questionnaireUUID?: string,
	) => void;

	//* Non-reactive readers (useful to load drafts in edition forms)
	getQuestionnaire: (
		questionnaireUUID?: string,
	) => QuestionnaireItemType | undefined;
	getQuestion: (
		questionUUID: string,
		questionnaireUUID?: string,
	) => QuestionItemType | undefined;
}

export type QuestionnaireSlice = QuestionnaireStoreStates &
	QuestionnaireStoreActions;

//* Helpers (module scope, immutable updates over nested sections/questions)

function updateQuestionnaireIn(
	record: Record<string, QuestionnaireItemType>,
	questionnaireUUID: string,
	updater: (item: QuestionnaireItemType) => QuestionnaireItemType,
): Record<string, QuestionnaireItemType> {
	const item = record[questionnaireUUID];
	if (!item) return record;
	return { ...record, [questionnaireUUID]: updater(item) };
}

function findQuestion(
	questionnaire: QuestionnaireItemType,
	questionUUID: string,
): QuestionItemType | undefined {
	for (const section of questionnaire.Sections) {
		const question = section.Questions.find(
			(q) => q.questionUUID === questionUUID,
		);
		if (question) return question;
	}
	return undefined;
}

function mapQuestion(
	questionnaire: QuestionnaireItemType,
	questionUUID: string,
	updater: (question: QuestionItemType) => QuestionItemType,
): QuestionnaireItemType {
	return {
		...questionnaire,
		Sections: questionnaire.Sections.map((section) => {
			if (!section.Questions.some((q) => q.questionUUID === questionUUID)) {
				return section;
			}
			return {
				...section,
				Questions: section.Questions.map((q) =>
					q.questionUUID === questionUUID ? updater(q) : q,
				),
			};
		}),
	};
}

//* Factory for a fresh question of a given type (used by addQuestion & UI drafts)
export function createDefaultQuestion(
	questionType: QuestionType,
): QuestionItemType {
	const base = {
		questionUUID: uuidv4(),
		prompt: "Untitled question",
		required: true,
		score: 0,
		branches: [] as QuestionBranchType[],
	};

	switch (questionType) {
		case "short_text":
			return { ...base, questionType, config: {} };
		case "long_text":
			return { ...base, questionType, config: {} };
		case "email":
			return { ...base, questionType, config: {} };
		case "date":
			return { ...base, questionType, config: {} };
		case "yes_no":
			return { ...base, questionType, config: {} };
		case "single_choice":
			return {
				...base,
				questionType,
				config: {
					options: [
						{ optionUUID: uuidv4(), label: "Option 1" },
						{ optionUUID: uuidv4(), label: "Option 2" },
					],
				},
			};
		case "multiple_choice":
			return {
				...base,
				questionType,
				config: {
					options: [
						{ optionUUID: uuidv4(), label: "Option 1" },
						{ optionUUID: uuidv4(), label: "Option 2" },
					],
				},
			};
		case "rating":
			return { ...base, questionType, config: { scale: 5 } };
		case "file":
			return { ...base, questionType, config: {} };
	}
}

//* Seed data: the default questionnaire referenced by the workflow demo
//* (`questionnaireUUID: "questionnaire-screening"` in constants.ts)
export const initialQuestionnaireUUID = "questionnaire-screening";

export const initialQuestionnaireList: Record<string, QuestionnaireItemType> = {
	[initialQuestionnaireUUID]: {
		name: "Screening Questionnaire",
		description:
			"Sent to candidates right after applying to assess experience, availability and seniority.",
		scoring: { enabled: true, passThreshold: 60 },
		Sections: [
			{
				sectionUUID: "section-profile",
				title: "Candidate Profile",
				description: "Basic contact and logistics details.",
				Questions: [
					{
						questionUUID: "question-full-name",
						questionType: "short_text",
						prompt: "Full name",
						required: true,
						score: 0,
						branches: [],
						config: { placeholder: "e.g. Jane Doe" },
					},
					{
						questionUUID: "question-email",
						questionType: "email",
						prompt: "Email address",
						required: true,
						score: 0,
						branches: [],
						config: { placeholder: "you@company.com" },
					},
					{
						questionUUID: "question-relocation",
						questionType: "single_choice",
						prompt: "Are you open to relocating for this role?",
						required: true,
						score: 0,
						branches: [],
						config: {
							options: [
								{ optionUUID: "option-relocation-yes", label: "Yes" },
								{ optionUUID: "option-relocation-no", label: "No" },
							],
						},
					},
				],
			},
			{
				sectionUUID: "section-skills",
				title: "Skills & Experience",
				description:
					"Scored section used to decide the screening result (>= 60%).",
				Questions: [
					{
						questionUUID: "question-experience",
						questionType: "rating",
						prompt: "Rate your overall experience level for this role",
						required: true,
						score: 20,
						branches: [],
						config: { scale: 5 },
					},
					{
						questionUUID: "question-stack",
						questionType: "multiple_choice",
						prompt: "Which of the following have you worked with?",
						required: true,
						score: 20,
						branches: [],
						config: {
							options: [
								{ optionUUID: "option-stack-react", label: "React" },
								{ optionUUID: "option-stack-node", label: "Node.js" },
								{ optionUUID: "option-stack-python", label: "Python" },
								{ optionUUID: "option-stack-docker", label: "Docker" },
								{
									optionUUID: "option-stack-none",
									label: "None of the above",
								},
							],
						},
					},
					{
						questionUUID: "question-availability",
						questionType: "yes_no",
						prompt: "Can you start within two weeks?",
						required: true,
						score: 10,
						branches: [
							{
								branchUUID: "branch-availability-no",
								operator: "equals",
								expectedValue: false,
								action: { type: "end_questionnaire" },
							},
						],
						config: {},
					},
					{
						questionUUID: "question-english",
						questionType: "single_choice",
						prompt: "How would you describe your English level?",
						required: true,
						score: 10,
						branches: [],
						config: {
							options: [
								{ optionUUID: "option-english-basic", label: "Basic" },
								{
									optionUUID: "option-english-intermediate",
									label: "Intermediate",
								},
								{ optionUUID: "option-english-advanced", label: "Advanced" },
								{ optionUUID: "option-english-fluent", label: "Fluent" },
							],
						},
					},
				],
			},
		],
	},
};

//* Deep clone de una pregunta con nuevos ids (questionUUID, options y branches).
function cloneQuestion(question: QuestionItemType): QuestionItemType {
	const copy = JSON.parse(JSON.stringify(question)) as QuestionItemType;
	copy.questionUUID = uuidv4();
	copy.branches = copy.branches.map((branch) => ({
		...branch,
		branchUUID: uuidv4(),
	}));

	if (
		copy.questionType === "single_choice" ||
		copy.questionType === "multiple_choice"
	) {
		const config = copy.config as { options: ChoiceOptionType[] };
		config.options = config.options.map((option) => ({
			...option,
			optionUUID: uuidv4(),
		}));
	}
	return copy;
}

//* Reordena una pregunta dentro de su sección (arriba/abajo).
function reorderQuestionInSection(
	questionnaire: QuestionnaireItemType,
	sectionUUID: string,
	questionUUID: string,
	direction: "up" | "down",
): QuestionnaireItemType {
	return {
		...questionnaire,
		Sections: questionnaire.Sections.map((section) => {
			if (section.sectionUUID !== sectionUUID) return section;

			const index = section.Questions.findIndex(
				(question) => question.questionUUID === questionUUID,
			);
			if (index < 0) return section;

			const to = direction === "up" ? index - 1 : index + 1;
			if (to < 0 || to >= section.Questions.length) return section;

			const Questions = [...section.Questions];
			const [moved] = Questions.splice(index, 1);
			Questions.splice(to, 0, moved);
			return { ...section, Questions };
		}),
	};
}

//* Mueve una pregunta a otra sección (la añade al final de la sección destino).
function moveQuestionBetweenSections(
	questionnaire: QuestionnaireItemType,
	questionUUID: string,
	toSectionUUID: string,
): QuestionnaireItemType {
	const source = questionnaire.Sections.find((section) =>
		section.Questions.some(
			(question) => question.questionUUID === questionUUID,
		),
	);
	if (!source) return questionnaire;
	if (source.sectionUUID === toSectionUUID) return questionnaire;

	const question = source.Questions.find(
		(q) => q.questionUUID === questionUUID,
	);
	if (!question) return questionnaire;

	return {
		...questionnaire,
		Sections: questionnaire.Sections.map((section) => {
			if (section.sectionUUID === source.sectionUUID) {
				return {
					...section,
					Questions: section.Questions.filter(
						(q) => q.questionUUID !== questionUUID,
					),
				};
			}
			if (section.sectionUUID === toSectionUUID) {
				return { ...section, Questions: [...section.Questions, question] };
			}
			return section;
		}),
	};
}

export const createQuestionnaireSlice: StateCreator<
	DemoStore,
	[["zustand/persist", unknown]],
	[],
	QuestionnaireSlice
> = (set, get) => ({
	CurrentQuestionnaireUUID: initialQuestionnaireUUID,
	Questionnaires: initialQuestionnaireList,

	createQuestionnaire: () => {
		const questionnaireUUID = uuidv4();
		const sectionUUID = uuidv4();

		set((state) => ({
			Questionnaires: {
				...state.Questionnaires,
				[questionnaireUUID]: {
					name: "Untitled Questionnaire",
					scoring: { enabled: false, passThreshold: 60 },
					Sections: [
						{
							sectionUUID,
							title: "Section 1",
							Questions: [],
						},
					],
				},
			},
			CurrentQuestionnaireUUID: questionnaireUUID,
		}));
	},

	removeQuestionnaire: (questionnaireUUID) =>
		set((state) => {
			if (!state.Questionnaires[questionnaireUUID]) return state;

			const Questionnaires = { ...state.Questionnaires };
			delete Questionnaires[questionnaireUUID];

			return {
				Questionnaires,
				CurrentQuestionnaireUUID:
					state.CurrentQuestionnaireUUID === questionnaireUUID
						? ""
						: state.CurrentQuestionnaireUUID,
			};
		}),

	restoreQuestionnaire: (questionnaireUUID, item, index) =>
		set((state) => {
			if (state.Questionnaires[questionnaireUUID]) return state;

			// Reinsert preserving the previous display order (Record insertion).
			const entries = Object.entries(state.Questionnaires);
			const insertAt =
				index === undefined
					? entries.length
					: Math.max(0, Math.min(index, entries.length));
			entries.splice(insertAt, 0, [questionnaireUUID, item]);

			return { Questionnaires: Object.fromEntries(entries) };
		}),

	selectQuestionnaire: (questionnaireUUID) => {
		set({ CurrentQuestionnaireUUID: questionnaireUUID });
	},

	duplicateQuestionnaire: (questionnaireUUID) =>
		set((state) => {
			const source = state.Questionnaires[questionnaireUUID];
			if (!source) return state;

			const uuid = uuidv4();
			const copy = JSON.parse(JSON.stringify(source)) as QuestionnaireItemType;
			copy.name = `${source.name} (Copy)`;

			return {
				Questionnaires: {
					...state.Questionnaires,
					[uuid]: copy,
				},
				CurrentQuestionnaireUUID: uuid,
			};
		}),

	renameQuestionnaire: (questionnaireUUID, name) =>
		set((state) => {
			const questionnaire = state.Questionnaires[questionnaireUUID];
			if (!questionnaire) return state;

			return {
				Questionnaires: {
					...state.Questionnaires,
					[questionnaireUUID]: {
						...questionnaire,
						name: name.trim(),
					},
				},
			};
		}),

	updateQuestionnaire: (questionnaireUUID, patch) =>
		set((state) => ({
			Questionnaires: updateQuestionnaireIn(
				state.Questionnaires,
				questionnaireUUID,
				(questionnaire) => ({
					...questionnaire,
					...patch,
					name: patch.name !== undefined ? patch.name : questionnaire.name,
					description:
						patch.description !== undefined
							? patch.description
							: questionnaire.description,
				}),
			),
		})),

	addSection: (questionnaireUUID) =>
		set((state) => {
			const uuid = questionnaireUUID ?? state.CurrentQuestionnaireUUID;
			if (!state.Questionnaires[uuid]) return state;

			const sectionUUID = uuidv4();
			return {
				Questionnaires: updateQuestionnaireIn(
					state.Questionnaires,
					uuid,
					(questionnaire) => ({
						...questionnaire,
						Sections: [
							...questionnaire.Sections,
							{
								sectionUUID,
								title: `Section ${questionnaire.Sections.length + 1}`,
								Questions: [],
							},
						],
					}),
				),
			};
		}),

	removeSection: (sectionUUID, questionnaireUUID) =>
		set((state) => {
			const uuid = questionnaireUUID ?? state.CurrentQuestionnaireUUID;
			if (!state.Questionnaires[uuid]) return state;

			return {
				Questionnaires: updateQuestionnaireIn(
					state.Questionnaires,
					uuid,
					(questionnaire) => ({
						...questionnaire,
						Sections: questionnaire.Sections.filter(
							(section) => section.sectionUUID !== sectionUUID,
						),
					}),
				),
			};
		}),

	renameSection: (sectionUUID, patch, questionnaireUUID) =>
		set((state) => {
			const uuid = questionnaireUUID ?? state.CurrentQuestionnaireUUID;
			if (!state.Questionnaires[uuid]) return state;

			return {
				Questionnaires: updateQuestionnaireIn(
					state.Questionnaires,
					uuid,
					(questionnaire) => ({
						...questionnaire,
						Sections: questionnaire.Sections.map((section) =>
							section.sectionUUID !== sectionUUID
								? section
								: {
										...section,
										title: patch.title?.trim() ?? section.title,
										description:
											patch.description?.trim() ?? section.description,
									},
						),
					}),
				),
			};
		}),

	addQuestion: (sectionUUID, questionType, questionnaireUUID) =>
		set((state) => {
			const uuid = questionnaireUUID ?? state.CurrentQuestionnaireUUID;
			if (!state.Questionnaires[uuid]) return state;

			const newQuestion = createDefaultQuestion(questionType);
			return {
				Questionnaires: updateQuestionnaireIn(
					state.Questionnaires,
					uuid,
					(questionnaire) => ({
						...questionnaire,
						Sections: questionnaire.Sections.map((section) =>
							section.sectionUUID !== sectionUUID
								? section
								: {
										...section,
										Questions: [...section.Questions, newQuestion],
									},
						),
					}),
				),
			};
		}),

	updateQuestion: (questionUUID, nextQuestion, questionnaireUUID) =>
		set((state) => {
			const uuid = questionnaireUUID ?? state.CurrentQuestionnaireUUID;
			const questionnaire = state.Questionnaires[uuid];
			if (!questionnaire) return state;

			return {
				Questionnaires: updateQuestionnaireIn(
					state.Questionnaires,
					uuid,
					(item) => mapQuestion(item, questionUUID, () => nextQuestion),
				),
			};
		}),

	removeQuestion: (questionUUID, questionnaireUUID) =>
		set((state) => {
			const uuid = questionnaireUUID ?? state.CurrentQuestionnaireUUID;
			const questionnaire = state.Questionnaires[uuid];
			if (!questionnaire) return state;

			return {
				Questionnaires: updateQuestionnaireIn(
					state.Questionnaires,
					uuid,
					(item) => ({
						...item,
						Sections: item.Sections.map((section) => {
							if (
								!section.Questions.some((q) => q.questionUUID === questionUUID)
							) {
								return section;
							}
							return {
								...section,
								Questions: section.Questions.filter(
									(q) => q.questionUUID !== questionUUID,
								),
							};
						}),
					}),
				),
			};
		}),

	duplicateQuestion: (sectionUUID, questionUUID, questionnaireUUID) =>
		set((state) => {
			const uuid = questionnaireUUID ?? state.CurrentQuestionnaireUUID;
			if (!state.Questionnaires[uuid]) return state;

			return {
				Questionnaires: updateQuestionnaireIn(
					state.Questionnaires,
					uuid,
					(questionnaire) => {
						const section = questionnaire.Sections.find(
							(section) => section.sectionUUID === sectionUUID,
						);
						if (!section) return questionnaire;

						const index = section.Questions.findIndex(
							(question) => question.questionUUID === questionUUID,
						);
						if (index < 0) return questionnaire;

						const copy = cloneQuestion(section.Questions[index]);
						return {
							...questionnaire,
							Sections: questionnaire.Sections.map((current) =>
								current.sectionUUID !== sectionUUID
									? current
									: {
											...current,
											Questions: [
												...current.Questions.slice(0, index + 1),
												copy,
												...current.Questions.slice(index + 1),
											],
										},
							),
						};
					},
				),
			};
		}),

	reorderQuestion: (sectionUUID, questionUUID, direction, questionnaireUUID) =>
		set((state) => {
			const uuid = questionnaireUUID ?? state.CurrentQuestionnaireUUID;
			if (!state.Questionnaires[uuid]) return state;

			return {
				Questionnaires: updateQuestionnaireIn(
					state.Questionnaires,
					uuid,
					(questionnaire) =>
						reorderQuestionInSection(
							questionnaire,
							sectionUUID,
							questionUUID,
							direction,
						),
				),
			};
		}),

	moveQuestion: (questionUUID, toSectionUUID, questionnaireUUID) =>
		set((state) => {
			const uuid = questionnaireUUID ?? state.CurrentQuestionnaireUUID;
			if (!state.Questionnaires[uuid]) return state;

			return {
				Questionnaires: updateQuestionnaireIn(
					state.Questionnaires,
					uuid,
					(questionnaire) =>
						moveQuestionBetweenSections(
							questionnaire,
							questionUUID,
							toSectionUUID,
						),
				),
			};
		}),

	setQuestionBranches: (questionUUID, branches, questionnaireUUID) =>
		set((state) => {
			const uuid = questionnaireUUID ?? state.CurrentQuestionnaireUUID;
			const questionnaire = state.Questionnaires[uuid];
			if (!questionnaire) return state;

			return {
				Questionnaires: updateQuestionnaireIn(
					state.Questionnaires,
					uuid,
					(item) =>
						mapQuestion(
							item,
							questionUUID,
							(question) => ({ ...question, branches }) as QuestionItemType,
						),
				),
			};
		}),

	addBranch: (questionUUID, branch, questionnaireUUID) =>
		set((state) => {
			const uuid = questionnaireUUID ?? state.CurrentQuestionnaireUUID;
			const questionnaire = state.Questionnaires[uuid];
			if (!questionnaire) return state;

			return {
				Questionnaires: updateQuestionnaireIn(
					state.Questionnaires,
					uuid,
					(item) =>
						mapQuestion(
							item,
							questionUUID,
							(question) =>
								({
									...question,
									branches: [...question.branches, branch],
								}) as QuestionItemType,
						),
				),
			};
		}),

	removeBranch: (questionUUID, branchUUID, questionnaireUUID) =>
		set((state) => {
			const uuid = questionnaireUUID ?? state.CurrentQuestionnaireUUID;
			const questionnaire = state.Questionnaires[uuid];
			if (!questionnaire) return state;

			return {
				Questionnaires: updateQuestionnaireIn(
					state.Questionnaires,
					uuid,
					(item) =>
						mapQuestion(
							item,
							questionUUID,
							(question) =>
								({
									...question,
									branches: question.branches.filter(
										(branch) => branch.branchUUID !== branchUUID,
									),
								}) as QuestionItemType,
						),
				),
			};
		}),

	getQuestionnaire: (questionnaireUUID) => {
		const uuid = questionnaireUUID ?? get().CurrentQuestionnaireUUID;
		return get().Questionnaires[uuid];
	},

	getQuestion: (questionUUID, questionnaireUUID) => {
		const uuid = questionnaireUUID ?? get().CurrentQuestionnaireUUID;
		const questionnaire = get().Questionnaires[uuid];
		if (!questionnaire) return undefined;
		return findQuestion(questionnaire, questionUUID);
	},
});
