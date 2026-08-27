import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
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
			(set, get) => ({
				CurrentWorkflowUUID: "0",
				Workflows: initialWorkflowList,

				nodeTypes: NodeTypes,
				edgeTypes: EdgeTypes,
				OpenMenuNodeId: null,

				// Workflow Functions
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
				toggleNodeDialog: (state) => {
					set(() => ({
						openDialog: state,
					}));
				},
				setNodeDialogId: (nodeId) => {
					set(() => ({
						nodeDialogId: nodeId,
					}));
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

				// Node Functions
				getNodeData: (nodeId) => {
					const state = get();
					const workflow = state.Workflows[state.CurrentWorkflowUUID];
					const node = workflow?.Nodes.find((n) => n.id === nodeId);
					return node?.data;
				},
				setNodeData: (nodeId, data) => {
					set((state) => {
						const workflow = state.Workflows[state.CurrentWorkflowUUID];
						if (!workflow) return {};

						return {
							Workflows: {
								...state.Workflows,
								[state.CurrentWorkflowUUID]: {
									...workflow,
									Nodes: workflow.Nodes.map((n) =>
										n.id === nodeId ? { ...n, data } : n,
									),
								},
							},
						};
					});
				},
			}),
			{
				name: "workflow-storage",
				version: 1.3,
				partialize: (state) => ({
					Workflows: state.Workflows,
					CurrentWorkflowUUID: state.CurrentWorkflowUUID,
				}),
			},
		),
	);
};
