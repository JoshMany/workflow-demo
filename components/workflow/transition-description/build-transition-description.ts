import type { ActionType } from "../types";
import { ACTION_LANGUAGE } from "./action-language";
import { TRANSITION_LANGUAGE } from "./transition-language";
import type { TransitionDescriptionInput } from "./types";

function describeAction(
	title: string,
	type: ActionType,
	mode: "completion" | "execution",
): string {
	const language = ACTION_LANGUAGE[type];

	return `the "${title}" ${language.object} ${language[mode]}`;
}

export function buildTransitionDescription({
	sourceAction,
	targetAction,
	transitionType,
	delay,
	condition,
}: TransitionDescriptionInput): string {
	const source = describeAction(
		sourceAction.title,
		sourceAction.type,
		"completion",
	);

	const target = describeAction(
		targetAction.title,
		targetAction.type,
		"execution",
	);

	return TRANSITION_LANGUAGE[transitionType](source, target, {
		delay,
		condition: condition?.description,
	});
}
