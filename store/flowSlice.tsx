import type {
	Edge,
	EdgeTypes,
	Node,
	NodeTypes,
	OnConnect,
	OnEdgesChange,
	OnNodesChange,
	OnNodesDelete,
} from "@xyflow/react";
import { addEdge, applyEdgeChanges, applyNodeChanges } from "@xyflow/react";
import type { StateCreator } from "zustand";
import { ActionNode } from "@/components/workflow/action-node";
import TransitionEdge from "@/components/workflow/transition-edge";
import type { DemoStore } from "./demoStore";

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

export interface FlowSliceStates {
	nodeTypes: NodeTypes;
	edgeTypes: EdgeTypes;
	// Buffer transitorio: edges que React Flow está borrando junto con los nodos.
	// React Flow dispara onEdgesChange ANTES que onNodesDelete, por lo que al
	// llegar a onNodesDelete esos edges ya no existen en Workflows[].Edges. Se
	// guardan aquí (con su data) para poder reconstruir las conexiones.
	pendingRemovedEdges: TransitionEdgeType[];
}

export interface FlowSliceActions {
	setNodes: (nodes: ActionNodeType[]) => void;
	onNodesChange: OnNodesChange<ActionNodeType>;
	onNodesDelete: OnNodesDelete<ActionNodeType>;
	onEdgesChange: OnEdgesChange<TransitionEdgeType>;
	onConnect: OnConnect;
	getNodeData: (nodeId: string) => CustomNodeData | undefined;
	setNodeData: (nodeId: string, data: CustomNodeData) => void;
}

export type FlowSlice = FlowSliceStates & FlowSliceActions;

//* Constants
const NodeTypesState = {
	actionNode: ActionNode,
};

const EdgeTypesState = {
	transitionEdge: TransitionEdge,
};

/**
 * Reconecta el grafo tras eliminar nodos: cada edge que entraba al nodo
 * borrado se encadena con cada edge que salía de él.
 *
 * `removed` debe contener los edges originales (con su `data` de tipo
 * TransitionEdgeData) que se borraron junto al nodo. La arista reconstruida
 * conserva la transición del edge ENTRANTE (`...inEdge`).
 */
function reconnectAfterDeletion(
	edges: TransitionEdgeType[],
	removed: TransitionEdgeType[],
	deletedIds: Set<string>,
): TransitionEdgeType[] {
	const result = [...edges];

	for (const nodeId of deletedIds) {
		const incomingEdges = removed.filter((edge) => edge.target === nodeId);
		const outgoingEdges = removed.filter((edge) => edge.source === nodeId);

		const reconnected = incomingEdges.flatMap((inEdge) =>
			outgoingEdges.map((outEdge) => ({
				...inEdge,
				id: `${inEdge.id}-${outEdge.id}`,
				source: inEdge.source,
				target: outEdge.target,
			})),
		);

		result.push(...reconnected);
	}

	// Al borrar varios nodos encadenados (A→B→C con B y C), descarta aristas que
	// aún referencien un nodo eliminado para no dejar conexiones colgantes.
	return result.filter(
		(edge) => !deletedIds.has(edge.source) && !deletedIds.has(edge.target),
	);
}

export const createFlowSlice: StateCreator<
	DemoStore,
	[["zustand/persist", unknown]],
	[],
	FlowSlice
> = (set, get) => ({
	nodeTypes: NodeTypesState,
	edgeTypes: EdgeTypesState,
	pendingRemovedEdges: [],

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
	onNodesDelete: (deleted) =>
		set((state) => {
			const uuid = state.CurrentWorkflowUUID;
			const currentWorkflow = state.Workflows[uuid];

			if (!currentWorkflow) return state;

			const deletedIds = new Set(deleted.map((node) => node.id));

			const removedEdges = state.pendingRemovedEdges.filter(
				(edge) => deletedIds.has(edge.source) || deletedIds.has(edge.target),
			);

			const Edges = reconnectAfterDeletion(
				currentWorkflow.Edges,
				removedEdges,
				deletedIds,
			);

			return {
				Workflows: {
					...state.Workflows,
					[uuid]: {
						...currentWorkflow,
						Edges,
					},
				},
				pendingRemovedEdges: [],
			};
		}),
	onEdgesChange: (changes) =>
		set((state) => {
			const uuid = state.CurrentWorkflowUUID;
			const current = state.Workflows[uuid];

			// Al borrar un nodo, React Flow elimina sus edges conectados ANTES de
			// llamar a onNodesDelete. Este es el único momento donde esos edges
			// siguen existiendo con su data: los capturamos en el buffer.
			const removeIds = new Set(
				changes.filter((change) => change.type === "remove").map((c) => c.id),
			);

			const pendingRemovedEdges = removeIds.size
				? current.Edges.filter((edge) => removeIds.has(edge.id))
				: [];

			return {
				Workflows: {
					...state.Workflows,
					[uuid]: {
						...current,
						Edges: applyEdgeChanges(changes, current.Edges),
					},
				},
				pendingRemovedEdges,
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
});
