"use client";

import type { TransitionDelay, TransitionType } from "./types";

function formatDelay(delay?: TransitionDelay): string {
	if (!delay) {
		return "after the configured delay";
	}

	const unit = delay.value === 1 ? delay.unit : `${delay.unit}s`;

	return `after ${delay.value} ${unit}`;
}

export const TRANSITION_LANGUAGE: Record<
	TransitionType,
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

	delayed: (source, target, options) =>
		`Once ${source}, ${target} ${formatDelay(options?.delay)}.`,

	conditional: (source, target, options) =>
		`Once ${source}, ${target} only when ${options?.condition ?? "the configured condition"} is met.`,
};
