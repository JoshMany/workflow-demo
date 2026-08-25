import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ActionNode } from "@/components/workflow/action-node";
import TransitionEdge from "@/components/workflow/transition-edge";
import type { WorkflowStore } from "@/components/workflow/types";
import { initialWorkflowList } from "./constants";

//* Constants
const NodeTypes = {
	actionNode: ActionNode,
};

const EdgeTypes = {
	transitionEdge: TransitionEdge,
};

export const createWorkflowStore = () => {
	return create<WorkflowStore>()(
		persist(
			(set) => ({
				CurrentWorkflowUUID: "0",
				Workflows: initialWorkflowList,

				nodeTypes: NodeTypes,
				edgeTypes: EdgeTypes,

				// Workflow Functions
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
				setNodes: (nodes) =>
					set((state) => {
						const uuid = state.CurrentWorkflowUUID;
						const current = state.Workflows[uuid];

						return {
							Workflows: {
								...state.Workflows,
								[uuid]: { ...current, Nodes: nodes },
							},
						};
					}),
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

				// Flow Events
				onNodesChange: (changes) =>
					set((state) => {
						const uuid = state.CurrentWorkflowUUID;
						const current = state.Workflows[uuid];

						return {
							Workflows: {
								...state.Workflows,
								[uuid]: {
									...current,
									Nodes: applyNodeChanges(changes, current.Nodes),
								},
							},
						};
					}),
				onEdgesChange: (changes) =>
					set((state) => {
						const uuid = state.CurrentWorkflowUUID;
						const current = state.Workflows[uuid];

						return {
							Workflows: {
								...state.Workflows,
								[uuid]: {
									...current,
									Edges: applyEdgeChanges(changes, current.Edges),
								},
							},
						};
					}),
				onConnect: (connection) =>
					set((state) => {
						const uuid = state.CurrentWorkflowUUID;
						const current = state.Workflows[uuid];

						return {
							Workflows: {
								...state.Workflows,
								[uuid]: {
									...current,
									Edges: addEdge(connection, current.Edges),
								},
							},
						};
					}),
			}),
			{
				name: "workflow-storage",
				version: 1,
				partialize: (state) => ({
					Workflows: state.Workflows,
					CurrentWorkflowUUID: state.CurrentWorkflowUUID,
				}),
			},
		),
	);
};
