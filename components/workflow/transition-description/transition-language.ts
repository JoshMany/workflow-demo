"use client";

import type { transitionTypes } from "../types";
import type { TransitionDelay } from "./types";

function formatDelay(delay?: TransitionDelay): string {
	if (!delay) {
		return "after the configured delay";
	}

	const unit = delay.value === 1 ? delay.unit : `${delay.unit}s`;

	return `after ${delay.value} ${unit}`;
}

export const TRANSITION_LANGUAGE: Record<
	transitionTypes,
	(
		source: string,
		target: string,
		options?: {
			delay?: TransitionDelay;
			condition?: string;
		},
	) => string
> = {
	immediate: (source, target) =>
		`As soon as ${source}, ${target} immediately, without any additional delay or condition.`,

	time_delay: (source, target, options) =>
		`Once ${source}, ${target} ${formatDelay(options?.delay)}.`,

	condition: (source, target, options) =>
		`Once ${source}, ${target} only when ${options?.condition ?? "the configured condition"} is met.`,

	event: (source, target, options) =>
		`Once ${source}, ${target} only when ${options?.condition ?? "the configured condition"} happens.`,
	manual: (source, target, options) =>
		`Once ${source}, ${target} immediately when ${options?.condition ?? "the configured condition"} happens.`,
};
