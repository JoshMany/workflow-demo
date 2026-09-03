import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FlowSlice } from "./flowSlice";
import { createFlowSlice } from "./flowSlice";
import type { QuestionnaireSlice } from "./questionnaireSlice";
import {
	createQuestionnaireSlice,
	initialQuestionnaireList,
	initialQuestionnaireUUID,
} from "./questionnaireSlice";
import type { WorkflowSlice } from "./workflowSlice";
import { createWorkflowSlice } from "./workflowSlice";

export type DemoStore = WorkflowSlice &
	FlowSlice &
	QuestionnaireSlice & {
		getAll: () => void;

		// Node Menu State
		OpenMenuNodeId: string | null;
		toggleNodeMenu: (nodeId: string) => void;
		closeNodeMenu: (nodeId: string) => void;

		// Dialog State
		nodeDialogId: string | null;
		openDialog: boolean;
		toggleNodeDialog: (state: boolean) => void;
		setNodeDialogId: (nodeId: string | null) => void;
	};

export const createDemoStore = create<DemoStore>()(
	persist(
		(set, get, store) => ({
			...createWorkflowSlice(set, get, store),
			...createFlowSlice(set, get, store),
			...createQuestionnaireSlice(set, get, store),

			// Main store only
			getAll: () => get(),

			OpenMenuNodeId: null,

			// Node Menu State
			toggleNodeMenu: (nodeId) =>
				set((state) => ({
					OpenMenuNodeId: state.OpenMenuNodeId === nodeId ? null : nodeId,
				})),
			closeNodeMenu: (nodeId) =>
				set((state) => ({
					OpenMenuNodeId:
						state.OpenMenuNodeId === nodeId ? null : state.OpenMenuNodeId,
				})),

			// Dialog State
			nodeDialogId: null,
			openDialog: false,
			toggleNodeDialog: (state) => set({ openDialog: state }),
			setNodeDialogId: (nodeId) => set({ nodeDialogId: nodeId }),
		}),
		{
			name: "workflow-storage",
			version: 1.5,
			partialize: (state) => ({
				Workflows: state.Workflows,
				CurrentWorkflowUUID: state.CurrentWorkflowUUID,
				Questionnaires: state.Questionnaires,
				CurrentQuestionnaireUUID: state.CurrentQuestionnaireUUID,
			}),
			migrate: (persistedState, version) => {
				if (version < 1.5) {
					const previous = persistedState as Partial<DemoStore>;
					return {
						...previous,
						Questionnaires: previous.Questionnaires ?? initialQuestionnaireList,
						CurrentQuestionnaireUUID:
							previous.CurrentQuestionnaireUUID ?? initialQuestionnaireUUID,
					} as DemoStore;
				}
				return persistedState as DemoStore;
			},
		},
	),
);
