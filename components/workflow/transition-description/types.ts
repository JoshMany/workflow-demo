import type { ActionType, transitionTypes } from "../types";

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
	transitionType: transitionTypes;
	delay?: TransitionDelay;
	condition?: TransitionCondition;
};
