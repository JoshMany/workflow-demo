import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
	ActionNodeType,
	FlowSlice,
	TransitionEdgeType,
} from "./flowSlice";
import { createFlowSlice } from "./flowSlice";
import type { QuestionnaireSlice } from "./questionnaireSlice";
import {
	createQuestionnaireSlice,
	initialQuestionnaireList,
	initialQuestionnaireUUID,
} from "./questionnaireSlice";
import type { WorkflowItemType, WorkflowSlice } from "./workflowSlice";
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
			version: 1.7,
			partialize: (state) => ({
				Workflows: state.Workflows,
				CurrentWorkflowUUID: state.CurrentWorkflowUUID,
				Questionnaires: state.Questionnaires,
				CurrentQuestionnaireUUID: state.CurrentQuestionnaireUUID,
			}),
			migrate: (persistedState, version) => {
				let state = persistedState as Partial<DemoStore>;

				// v1.5 → v1.6: los nodos Condition pasan de la descripción libre
				// `{ condition: string }` a la regla estructurada
				// `{ operator, value, description }`. Se conserva la descripción
				// previa; el operador/valor caen a un umbral por defecto (≥ 60).
				if (version < 1.6 && state.Workflows) {
					const Workflows: Record<string, WorkflowItemType> = {};
					for (const [uuid, workflow] of Object.entries(state.Workflows)) {
						Workflows[uuid] = {
							...workflow,
							Nodes: (workflow.Nodes ?? []).map((node) => {
								if (node.data.actionType !== "condition") return node;

								// Los datos persistidos pueden preceder a la regla
								// estructurada: `{ condition: string }`.
								const legacy = (
									node.data.config as unknown as {
										condition?: string;
									}
								).condition;
								if (typeof legacy !== "string") return node;

								return {
									...node,
									data: {
										...node.data,
										config: {
											operator: "greater_than_or_equal",
											value: 60,
											description: legacy,
										},
									},
								} as ActionNodeType;
							}),
						};
					}
					state = { ...state, Workflows };
				}

				if (version < 1.7 && state.Workflows) {
					const Workflows: Record<string, WorkflowItemType> = {};
					for (const [uuid, workflow] of Object.entries(state.Workflows)) {
						const Nodes = workflow.Nodes ?? [];
						Workflows[uuid] = {
							...workflow,
							Edges: (workflow.Edges ?? []).map((edge) => {
								const data = edge.data;
								if (data?.transitionType !== "condition") return edge;
								if (data.condition.branch) return edge;

								// La rama positiva es la que coincide con la regla del
								// nodo Condition origen; la negativa, la complementaria.
								let isPositive = false;
								const sourceNode = Nodes.find(
									(node) => node.id === edge.source,
								);
								if (sourceNode) {
									const sourceData = sourceNode.data;
									if (sourceData.actionType === "condition") {
										isPositive =
											sourceData.config.operator === data.condition.operator &&
											sourceData.config.value === data.condition.value;
									}
								}

								return {
									...edge,
									data: {
										...data,
										condition: {
											...data.condition,
											branch: isPositive ? "positive" : "negative",
										},
									},
								} as TransitionEdgeType;
							}),
						};
					}
					state = { ...state, Workflows };
				}

				if (version < 1.5) {
					return {
						...state,
						Questionnaires: state.Questionnaires ?? initialQuestionnaireList,
						CurrentQuestionnaireUUID:
							state.CurrentQuestionnaireUUID ?? initialQuestionnaireUUID,
					} as DemoStore;
				}

				return state as DemoStore;
			},
		},
	),
);
