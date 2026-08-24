export type ActionType =
	| "email"
	| "notification"
	| "questionnaire"
	| "interview guide"
	| "task";

export type TransitionType = "immediate" | "delayed" | "conditional";

export type DelayUnit = "minute" | "hour" | "day";

export type TransitionDelay = {
	value: number;
	unit: DelayUnit;
};

export type TransitionCondition = {
	description: string;
};

export type TransitionDescriptionInput = {
	sourceAction: {
		title: string;
		type: ActionType;
	};
	targetAction: {
		title: string;
		type: ActionType;
	};
	transitionType: TransitionType;
	delay?: TransitionDelay;
	condition?: TransitionCondition;
};
