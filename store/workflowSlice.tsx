import { v4 as uuidv4 } from "uuid";
import type { StateCreator } from "zustand";
import { initialWorkflowList } from "@/components/workflow/constants";
import type { DemoStore } from "./demoStore";
import type { ActionNodeType, TransitionEdgeType } from "./flowSlice";

export type WorkflowItemType = {
	name: string;
	Nodes: ActionNodeType[];
	Edges: TransitionEdgeType[];
	config?: {
		is_default?: boolean;
	};
};

export interface WorkflowStoreStates {
	Workflows: Record<string, WorkflowItemType>;
	CurrentWorkflowUUID: string;
}

export interface WorkflowStoreActions {
	createWorkflow: () => void;
	selectWorkflow: (uuid: string) => void;
	renameWorkflow: (uuid: string, name: string) => void;
}

export type WorkflowSlice = WorkflowStoreStates & WorkflowStoreActions;

export const createWorkflowSlice: StateCreator<
	DemoStore,
	[["zustand/persist", unknown]],
	[],
	WorkflowSlice
> = (set) => ({
	CurrentWorkflowUUID: "0",
	Workflows: initialWorkflowList,

	createWorkflow: () => {
		const uuid = uuidv4();

		set((state) => ({
			Workflows: {
				...state.Workflows,
				[uuid]: {
					name: "New Workflow",
					Nodes: [],
					Edges: [],
				},
			},
			CurrentWorkflowUUID: uuid,
		}));
	},
	selectWorkflow: (uuid) => {
		set({
			CurrentWorkflowUUID: uuid,
		});
	},
	renameWorkflow: (uuid, newName) => {
		if (uuid === "0") {
			throw new Error(
				"The default workflow cannot be renamed. Try duplicating the default workflow.",
			);
		}

		if (newName.trim().toLowerCase() === "default workflow") {
			throw new Error(
				'The name "Default Workflow" is reserved for the default workflow template. Please assign a different name.',
			);
		}

		set((state) => {
			const workflow = state.Workflows[uuid];

			if (!workflow) {
				throw new Error(`Workflow "${uuid}" was not found.`);
			}

			return {
				Workflows: {
					...state.Workflows,
					[uuid]: { ...workflow, name: newName.trim() },
				},
			};
		});
	},
});
