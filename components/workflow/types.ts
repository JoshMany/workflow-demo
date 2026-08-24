import type {
	Edge,
	EdgeProps,
	EdgeTypes,
	Node,
	NodeProps,
	NodeTypes,
	OnConnect,
	OnEdgesChange,
	OnNodesChange,
} from "@xyflow/react";
import type { ComponentType } from "react";

//* Workflow Structure
export type WorkflowItemType = {
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
};
export type ActionNodeType = Node<CustomNodeData, "actionNode">;

//* Custom Transition Edge
export type transitionTypes = "immediate" | "delayed" | "conditional";
export type CustomEdgeData = {
	transitionType: transitionTypes;
	transitionUUID: string;
};
export type TransitionEdgeType = Edge<CustomEdgeData, "transitionEdge">;

//* Workflow Store
export interface WorkflowStoreStates {
	Workflows: Record<string, WorkflowItemType>;
	CurrentWorkflowUUID: string;
}
export interface WorkflowStore extends WorkflowStoreStates {
	nodeTypes: NodeTypes;
	edgeTypes: EdgeTypes;

	createWorkflow: () => void;
	selectWorkflow: (uuid: string) => void;
	setNodes: (nodes: ActionNodeType[]) => void;

	onNodesChange: OnNodesChange<ActionNodeType>;
	onEdgesChange: OnEdgesChange<TransitionEdgeType>;
	onConnect: OnConnect;
}
