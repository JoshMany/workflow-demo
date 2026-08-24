"use client";

import {
	Background,
	Controls,
	MiniMap,
	Panel,
	ReactFlow,
	ReactFlowProvider,
	useNodesInitialized,
	useReactFlow,
} from "@xyflow/react";
import { useTheme } from "next-themes";
import { useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getLayoutedNodes } from "@/components/workflow/elk-layout";
import { useWorkflowStore } from "@/providers/workflow-store-provider";
import type { WorkflowItemType } from "./types";

function WorkflowChart() {
	const {
		Workflows,
		CurrentWorkflowUUID,
		onNodesChange,
		onEdgesChange,
		onConnect,
		nodeTypes,
		edgeTypes,
		setNodes,
	} = useWorkflowStore((state) => state);
	const currentWorkflow = Workflows.find(
		(workflow: WorkflowItemType) => workflow.UUID === CurrentWorkflowUUID,
	);

	const Nodes = currentWorkflow?.Nodes ?? [];
	const Edges = currentWorkflow?.Edges ?? [];
	const { resolvedTheme } = useTheme();
	const { fitView } = useReactFlow();
	const nodesInitialized = useNodesInitialized();

	const onLayout = useCallback(
		async (direction: "DOWN" | "RIGHT") => {
			const layoutedNodes = await getLayoutedNodes(Nodes, Edges, {
				"elk.direction": direction,
			});

			setNodes(layoutedNodes);

			requestAnimationFrame(() => {
				fitView({
					padding: 0.2,
				});
			});
		},
		[Nodes, Edges, setNodes, fitView],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: On mount
	useEffect(() => {
		if (!nodesInitialized) return;

		onLayout("DOWN");
	}, [nodesInitialized]);

	return (
		<div className="h-full w-full rounded-lg border bg-background">
			<ReactFlow
				nodes={Nodes}
				edges={Edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				onConnect={onConnect}
				fitView
				fitViewOptions={{
					padding: 0.2,
				}}
				defaultEdgeOptions={{
					animated: true,
				}}
				colorMode={resolvedTheme === "dark" ? "dark" : "light"}
			>
				<Panel position="top-left">
					<h2>{"Blank Workflow"}</h2>
				</Panel>
				<Panel position="top-right">
					<Button onClick={() => onLayout("DOWN")}>Vertical layout</Button>
					<Button onClick={() => onLayout("RIGHT")}>Horizontal layout</Button>
				</Panel>
				<Background />
				<MiniMap />
				<Controls />
			</ReactFlow>
		</div>
	);
}

function Workflow() {
	return (
		<ReactFlowProvider>
			<WorkflowChart />
		</ReactFlowProvider>
	);
}

export default Workflow;
