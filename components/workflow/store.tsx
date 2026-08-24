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
