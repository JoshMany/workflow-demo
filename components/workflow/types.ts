import type {
	Edge,
	Node,
	OnConnect,
	OnEdgesChange,
	OnNodesChange,
} from "@xyflow/react";
import type { ComponentType } from "react";

//* Workflow Structure
export type WorkflowItemType = {
	UUID: string;
	name: string;
	Nodes: ActionNodeType[];
	Edges: TransitionEdgeType[];
};

//* Custom Action Node
export type ActionType =
	| "email"
	| "notification"
	| "questionnaire"
	| "interview guide"
	| "task";
export type CustomNodeData = {
	actionTitle: string;
	actionType: ActionType;
	actionUUID: string;
	workflowUUID: string;
};
export type ActionNodeType = Node<CustomNodeData, "actionNode">;

//* Custom Transition Edge
export type transitionTypes = "immediate" | "delayed" | "conditional";
export type CustomEdgeData = {
	transitionType: transitionTypes;
	transitionUUID: string;
	workflowUUID: string;
};
export type TransitionEdgeType = Edge<CustomEdgeData, "transitionEdge">;

//* Workflow Store
export interface WorkflowStoreStates {
	Workflows: WorkflowItemType[];
	CurrentWorkflowUUID: string;
}
export interface WorkflowStore extends WorkflowStoreStates {
	nodeTypes: Record<string, ComponentType<ActionNodeType>>;
	edgeTypes: Record<string, ComponentType<TransitionEdgeType>>;

	createWorkflow: () => void;
	selectWorkflow: (uuid: string) => void;

	onNodesChange: OnNodesChange<ActionNodeType>;
	onEdgesChange: OnEdgesChange<TransitionEdgeType>;
	onConnect: OnConnect;
}
