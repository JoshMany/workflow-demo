import type {
	Edge,
	EdgeTypes,
	Node,
	NodeTypes,
	OnConnect,
	OnEdgesChange,
	OnNodesChange,
} from "@xyflow/react";

//* Workflow Structure
export type WorkflowItemType = {
	name: string;
	Nodes: ActionNodeType[];
	Edges: TransitionEdgeType[];
	config?: {
		is_default?: boolean;
	};
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
	renameWorkflow: (uuid: string, name: string) => void;

	onNodesChange: OnNodesChange<ActionNodeType>;
	onEdgesChange: OnEdgesChange<TransitionEdgeType>;
	onConnect: OnConnect;
}
