import type {
	Connection,
	Edge,
	EdgeTypes,
	Node,
	NodeTypes,
	OnConnect,
	OnEdgesChange,
	OnNodesChange,
	OnNodesDelete,
} from "@xyflow/react";
import { applyEdgeChanges, applyNodeChanges, MarkerType } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
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

//* Comparison operators supported by a numeric rule (shared by condition nodes
//* and the `condition` transition edges that branch out of them).
export type ConditionOperator = "greater_than_or_equal" | "less_than";

//* Which branch an outgoing `condition` edge represents when it leaves a
//* Condition node: `positive` = the rule is met (pass / yes), `negative` = the
//* rule is not met (fail / no).
export type ConditionBranch = "positive" | "negative";

export type ConditionConfig = {
	//* Structured rule: how the candidate's result compares against `value`.
	operator: ConditionOperator;
	value: number;
	//* Human-readable summary of the rule. When the structured fields change, the
	//* UI keeps it in sync unless the user wrote their own wording.
	description: string;
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
				operator: ConditionOperator;
				value: number;
				description: string;
				//* `positive` = rama que cumple la regla (yes/pass);
				//* `negative` = rama complementaria (no/fail).
				branch: ConditionBranch;
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
	addNode: (actionType: ActionType) => void;
	onNodesChange: OnNodesChange<ActionNodeType>;
	onNodesDelete: OnNodesDelete<ActionNodeType>;
	onEdgesChange: OnEdgesChange<TransitionEdgeType>;
	onConnect: OnConnect;
	/** Crea una arista de condici\u00f3n desde un nodo Condition (m\u00e1x. 2 salientes).
	 * Devuelve el id de la arista creada, o `null` si no est\u00e1 permitido. */
	connectConditionEdge: (connection: Connection) => string | null;
	removeEdge: (edgeId: string) => void;
	getEdgeData: (edgeId: string) => TransitionEdgeData | undefined;
	setEdgeData: (edgeId: string, data: TransitionEdgeData) => void;
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

//* Aristas de tipo `condition` que salen de un nodo (máximo 2 por nodo).
function getConditionOutgoingEdges(
	edges: TransitionEdgeType[],
	sourceId: string,
): TransitionEdgeType[] {
	return edges.filter(
		(edge) =>
			edge.source === sourceId && edge.data?.transitionType === "condition",
	);
}

//* Operador complementario: la rama negativa evalúa lo contrario que la positiva.
function complementOperator(operator: ConditionOperator): ConditionOperator {
	return operator === "greater_than_or_equal"
		? "less_than"
		: "greater_than_or_equal";
}

//* Construye una arista de transición completa (id, tipo custom, data, marcador).
function createTransitionEdge(
	connection: Connection,
	data: TransitionEdgeData,
): TransitionEdgeType {
	return {
		id: uuidv4(),
		source: connection.source,
		target: connection.target,
		sourceHandle: connection.sourceHandle ?? undefined,
		targetHandle: connection.targetHandle ?? undefined,
		type: "transitionEdge",
		animated: true,
		data,
		markerEnd: { type: MarkerType.ArrowClosed },
	};
}

//* Defaults para un nodo de acción nuevo, según su tipo.
function createActionData(actionType: ActionType): CustomNodeData {
	const actionUUID = uuidv4();

	switch (actionType) {
		case "email":
			return {
				actionTitle: "Send Email",
				actionType,
				actionUUID,
				config: {
					subject: "",
					recipient: { type: "candidate" },
					body: "",
				},
			};
		case "internal_notification":
			return {
				actionTitle: "Send Notification",
				actionType,
				actionUUID,
				config: { body: "" },
			};
		case "questionnaire":
			return {
				actionTitle: "Send Questionnaire",
				actionType,
				actionUUID,
				config: { questionnaireUUID: "" },
			};
		case "interview":
			return {
				actionTitle: "Schedule Interview",
				actionType,
				actionUUID,
				config: { interviewType: "video" },
			};
		case "manual_task":
			return {
				actionTitle: "Manual Task",
				actionType,
				actionUUID,
				config: { description: "" },
			};
		case "condition":
			return {
				actionTitle: "Condition",
				actionType,
				actionUUID,
				config: {
					operator: "greater_than_or_equal",
					value: 60,
					description: "",
				},
			};
	}
}

function createActionNode(
	actionType: ActionType,
	index: number,
): ActionNodeType {
	return {
		id: uuidv4(),
		type: "actionNode",
		position: { x: 0, y: index * 120 },
		data: createActionData(actionType),
	};
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
	addNode: (actionType) =>
		set((state) => {
			const workflowUUID = state.CurrentWorkflowUUID;
			const workflow = state.Workflows[workflowUUID];
			if (!workflow) return state;

			const node = createActionNode(actionType, workflow.Nodes.length);
			return {
				Workflows: {
					...state.Workflows,
					[workflowUUID]: {
						...workflow,
						Nodes: [...workflow.Nodes, node],
					},
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
			if (!current) return {};

			const edge = createTransitionEdge(connection, {
				transitionUUID: uuidv4(),
				transitionType: "immediate",
			});

			return {
				Workflows: {
					...state.Workflows,
					[uuid]: { ...current, Edges: [...current.Edges, edge] },
				},
			};
		}),
	connectConditionEdge: (connection) => {
		const state = get();
		const uuid = state.CurrentWorkflowUUID;
		const workflow = state.Workflows[uuid];
		if (!workflow) return null;

		const sourceNode = workflow.Nodes.find((n) => n.id === connection.source);
		if (sourceNode?.data.actionType !== "condition") return null;

		// Un nodo Condition solo puede tener 2 aristas salientes
		// (positiva y negativa).
		const outgoing = getConditionOutgoingEdges(
			workflow.Edges,
			connection.source,
		);
		if (outgoing.length >= 2) return null;

		const usedBranches = new Set(
			outgoing.map((edge) =>
				edge.data?.transitionType === "condition"
					? edge.data.condition.branch
					: undefined,
			),
		);
		const branch: ConditionBranch = usedBranches.has("positive")
			? "negative"
			: "positive";

		// Prefill: la rama positiva hereda la regla del nodo; la negativa usa su
		// complemento. El diálogo permite ajustarlo.
		const rule = sourceNode.data.config;
		const condition =
			branch === "positive"
				? {
						operator: rule.operator,
						value: rule.value,
						description: rule.description,
						branch,
					}
				: {
						operator: complementOperator(rule.operator),
						value: rule.value,
						description: "",
						branch,
					};

		const edge = createTransitionEdge(connection, {
			transitionUUID: uuidv4(),
			transitionType: "condition",
			condition,
		});

		set((current) => {
			const currentWorkflow = current.Workflows[uuid];
			if (!currentWorkflow) return {};

			return {
				Workflows: {
					...current.Workflows,
					[uuid]: {
						...currentWorkflow,
						Edges: [...currentWorkflow.Edges, edge],
					},
				},
			};
		});

		return edge.id;
	},
	removeEdge: (edgeId) =>
		set((state) => {
			const uuid = state.CurrentWorkflowUUID;
			const workflow = state.Workflows[uuid];
			if (!workflow) return {};

			return {
				Workflows: {
					...state.Workflows,
					[uuid]: {
						...workflow,
						Edges: workflow.Edges.filter((edge) => edge.id !== edgeId),
					},
				},
			};
		}),
	getEdgeData: (edgeId) => {
		const state = get();
		const workflow = state.Workflows[state.CurrentWorkflowUUID];
		const edge = workflow?.Edges.find((e) => e.id === edgeId);
		return edge?.data;
	},
	setEdgeData: (edgeId, data) =>
		set((state) => {
			const workflow = state.Workflows[state.CurrentWorkflowUUID];
			if (!workflow) return {};

			return {
				Workflows: {
					...state.Workflows,
					[state.CurrentWorkflowUUID]: {
						...workflow,
						Edges: workflow.Edges.map((edge) =>
							edge.id === edgeId ? { ...edge, data } : edge,
						),
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
