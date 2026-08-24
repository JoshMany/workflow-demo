import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ActionNode } from "@/components/workflow/action-node";
import TransitionEdge from "@/components/workflow/transition-edge";
import type {
	WorkflowItemType,
	WorkflowStore,
} from "@/components/workflow/types";
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

					const newWorkflow: WorkflowItemType = {
						UUID: uuid,
						name: "New Workflow",
						Nodes: [],
						Edges: [],
					};

					set((state) => ({
						Workflows: [...state.Workflows, newWorkflow],
						CurrentWorkflowUUID: uuid,
					}));
				},
				selectWorkflow: (uuid) => {
					set({
						CurrentWorkflowUUID: uuid,
					});
				},

				onNodesChange: (changes) =>
					set((state) => ({
						Workflows: state.Workflows.map((workflow) => {
							if (workflow.UUID !== state.CurrentWorkflowUUID) {
								return workflow;
							}

							return {
								...workflow,
								Nodes: applyNodeChanges(changes, workflow.Nodes),
							};
						}),
					})),

				onEdgesChange: (changes) =>
					set((state) => ({
						Workflows: state.Workflows.map((workflow) => {
							if (workflow.UUID !== state.CurrentWorkflowUUID) {
								return workflow;
							}

							return {
								...workflow,
								Edges: applyEdgeChanges(changes, workflow.Edges),
							};
						}),
					})),
				onConnect: (connection) =>
					set((state) => ({
						Workflows: state.Workflows.map((workflow) => {
							if (workflow.UUID !== state.CurrentWorkflowUUID) {
								return workflow;
							}

							return {
								...workflow,

								Edges: addEdge(connection, workflow.Edges),
							};
						}),
					})),
			}),
			{
				name: "workflow-storage",
				partialize: (state) => ({
					Workflows: state.Workflows,
					CurrentWorkflowUUID: state.CurrentWorkflowUUID,
				}),
			},
		),
	);
};
