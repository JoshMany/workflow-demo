"use client";

import type { ActionType } from "./types";

type ActionLanguage = {
	object: string;
	completion: string;
	execution: string;
};

export const ACTION_LANGUAGE: Record<ActionType, ActionLanguage> = {
	email: {
		object: "email",
		completion: "has been sent",
		execution: "will be sent",
	},

	notification: {
		object: "notification",
		completion: "has been sent",
		execution: "will be sent",
	},

	questionnaire: {
		object: "questionnaire",
		completion: "has been completed",
		execution: "will be presented",
	},

	"interview guide": {
		object: "interview guide",
		completion: "has been delivered",
		execution: "will be delivered",
	},

	task: {
		object: "task",
		completion: "has been completed",
		execution: "will be assigned",
	},
};
