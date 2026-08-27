import type {
	ActionNodeType,
	ActionType,
	FlowSlice,
	TransitionEdgeType,
} from "@/store/flowSlice";
import type {
	WorkflowItemType,
	WorkflowStoreActions,
	WorkflowStoreStates,
} from "@/store/workflowSlice";

//* Transition type labels used across the workflow UI
export type transitionTypes =
	| "immediate"
	| "time_delay"
	| "condition"
	| "event"
	| "manual";

export type {
	ActionNodeType,
	ActionType,
	TransitionEdgeType,
	WorkflowItemType,
};

//* Workflow Store
export interface WorkflowStore
	extends WorkflowStoreStates,
		WorkflowStoreActions,
		FlowSlice {
	OpenMenuNodeId: string | null;
	toggleNodeMenu: (nodeId: string) => void;
	closeNodeMenu: (nodeId: string) => void;

	nodeDialogId: string | null;
	openDialog: boolean;
	setNodeDialogId: (nodeId: string | null) => void;
	toggleNodeDialog: (state: boolean) => void;
}
