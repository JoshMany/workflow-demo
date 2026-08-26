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
export type BaseActionData = {
	actionTitle: string;
	actionUUID: string;
};
export type ActionType =
	| "email"
	| "internal_notification"
	| "questionnaire"
	| "interview"
	| "manual_task"
	| "condition";
export type EmailRecipient =
	| {
			type: "candidate";
	  }
	| {
			type: "admin";
	  }
	| {
			type: "specific";
			email: string;
	  };
export type EmailTriggerType = "button_click" | "link_click";
export type EmailTrigger = {
	id: string;
	type: EmailTriggerType;
};
export type InterviewType = "phone" | "video" | "onsite";
export type ActionConfigMap = {
	email: EmailConfig;
	internal_notification: InternalNotificationConfig;
	questionnaire: QuestionnaireConfig;
	interview: InterviewConfig;
	manual_task: ManualTaskConfig;
	condition: ConditionConfig;
};
export type CustomNodeData = {
	[K in keyof ActionConfigMap]: BaseActionData & {
		actionType: K;
		config: ActionConfigMap[K];
	};
}[keyof ActionConfigMap];
export type EmailConfig = {
	subject: string;
	recipient: EmailRecipient;
	body: string;
	trigger?: EmailTrigger;
};
export type InternalNotificationConfig = {
	body: string;
};
export type QuestionnaireConfig = {
	questionnaireUUID: string;
};
export type InterviewConfig = {
	interviewer?: string;
	durationMinutes?: number;
	interviewType: InterviewType;
};
export type ManualTaskConfig = {
	description: string;
	assignee?: string;
	dueDate?: string;
};
export type ConditionConfig = {
	condition: string;
};
export type ActionNodeType = Node<CustomNodeData, "actionNode">;

//* Custom Transition Edge
export type TransitionType = "immediate" | "time_delay" | "event" | "condition";
export type TransitionEdgeData =
	| {
			transitionUUID: string;
			transitionType: "immediate";
	  }
	| {
			transitionUUID: string;
			transitionType: "time_delay";
			delay: {
				amount: number;
				unit: "minutes" | "hours" | "days";
			};
	  }
	| {
			transitionUUID: string;
			transitionType: "event";
			event: {
				triggerUUID: string;
				description: string;
			};
	  }
	| {
			transitionUUID: string;
			transitionType: "condition";
			condition: {
				operator: "greater_than_or_equal" | "less_than";
				value: number;
				description: string;
			};
	  };
export type TransitionEdgeType = Edge<TransitionEdgeData, "transitionEdge">;

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

	OpenMenuNodeId: string | null;
	toggleNodeMenu: (nodeId: string) => void;
	closeNodeMenu: (nodeId: string) => void;

	nodeDialogId: string | null;
	openDialog: boolean;
	setNodeDialogId: (nodeId: string | null) => void;
	toggleNodeDialog: (state: boolean) => void;

	onNodesChange: OnNodesChange<ActionNodeType>;
	onEdgesChange: OnEdgesChange<TransitionEdgeType>;
	onConnect: OnConnect;

	getNodeData: (nodeId: string) => CustomNodeData | undefined;
	setNodeData: (nodeId: string, data: CustomNodeData) => void;
}
