import { MarkerType } from "@xyflow/react";
import type { WorkflowItemType } from "@/components/workflow/types";

export const initialWorkflowList: WorkflowItemType[] = [
	{
		UUID: "0",
		name: "Default Workflow",
		Nodes: [
			{
				id: "n1",
				position: { x: 0, y: 0 },
				type: "actionNode",
				data: {
					actionTitle: "Send Greeting Email",
					actionType: "email",
					actionUUID: "1",
				},
			},
			{
				id: "n2",
				position: { x: 0, y: 100 },
				type: "actionNode",
				data: {
					actionTitle: "Send Notification",
					actionType: "notification",
					actionUUID: "2",
				},
			},
			{
				id: "n3",
				position: { x: 0, y: 200 },
				type: "actionNode",
				data: {
					actionTitle: "Initial Questionnaire",
					actionType: "questionnaire",
					actionUUID: "3",
				},
			},
			{
				id: "n4",
				position: { x: 0, y: 300 },
				type: "actionNode",
				data: {
					actionTitle: "Review",
					actionType: "task",
					actionUUID: "4",
				},
			},
		],
		Edges: [
			{
				id: "e1-2",
				source: "n1",
				target: "n2",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "immediate",
					transitionUUID: "1",
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
				markerStart: {
					type: MarkerType.ArrowClosed,
					orient: "auto-start-reverse",
				},
			},
			{
				id: "e2-3",
				source: "n2",
				target: "n3",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "delayed",
					transitionUUID: "2",
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
				markerStart: {
					type: MarkerType.ArrowClosed,
					orient: "auto-start-reverse",
				},
			},
			{
				id: "e3-e4",
				source: "n3",
				target: "n4",
				animated: true,
				type: "transitionEdge",
				data: {
					transitionType: "conditional",
					transitionUUID: "3",
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
				markerStart: {
					type: MarkerType.ArrowClosed,
					orient: "auto-start-reverse",
				},
			},
		],
	},
];
