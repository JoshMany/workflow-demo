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
import { type MouseEvent, useCallback, useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { getLayoutedNodes } from "@/components/workflow/elk-layout";
import { useDemoStore } from "@/providers/workflow-store-provider";
import EditEmailNode from "./forms/edit-email-node";
import type { ActionNodeType } from "./types";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "../ui/context-menu";

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
		onNodesDelete,
		setNodeDialogId,
		toggleNodeDialog,
	} = useDemoStore(
		useShallow((state) => ({
			Workflows: state.Workflows,
			CurrentWorkflowUUID: state.CurrentWorkflowUUID,
			onNodesChange: state.onNodesChange,
			onEdgesChange: state.onEdgesChange,
			onConnect: state.onConnect,
			nodeTypes: state.nodeTypes,
			edgeTypes: state.edgeTypes,
			setNodes: state.setNodes,
			onNodesDelete: state.onNodesDelete,
			setNodeDialogId: state.setNodeDialogId,
			toggleNodeDialog: state.toggleNodeDialog,
		})),
	);

	const currentWorkflow = Workflows[CurrentWorkflowUUID];

	const Nodes = currentWorkflow?.Nodes ?? [];
	const Edges = currentWorkflow?.Edges ?? [];
	const { resolvedTheme } = useTheme();
	const { fitView, deleteElements } = useReactFlow();
	const nodesInitialized = useNodesInitialized();

	// Evita el mismatch de hidratación: hasta que el componente no está montado
	// (cliente), colorMode se mantiene en "light", igual que lo que renderiza
	// el servidor. Tras el montaje, sigue el tema resuelto.
	const [mounted, setMounted] = useState(false);

	const colorMode = mounted && resolvedTheme === "dark" ? "dark" : "light";

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

	const [menuNodeId, setMenuNodeId] = useState<string | null>(null);

	const onNodeContextMenu = useCallback(
		(event: MouseEvent, node: ActionNodeType) => {
			// Previene el menú contextual nativo del navegador
			event.preventDefault();
			setMenuNodeId(node.id);
		},
		[],
	);
	const onPaneClick = useCallback(() => setMenuNodeId(null), []);
	const onPaneContextMenu = useCallback(() => setMenuNodeId(null), []);

	useEffect(() => {
		setMounted(true);
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: On mount
	useEffect(() => {
		if (!nodesInitialized) return;

		onLayout("DOWN");
	}, [nodesInitialized]);

	return (
		<div className="flex flex-1 rounded-lg border bg-background">
			<ContextMenu>
				<ContextMenuTrigger
					render={
						<div className="relative flex-1">
							<ReactFlow
								nodes={Nodes}
								edges={Edges}
								onNodesChange={onNodesChange}
								onNodeContextMenu={onNodeContextMenu}
								onPaneClick={onPaneClick}
								onPaneContextMenu={onPaneContextMenu}
								onEdgesChange={onEdgesChange}
								nodeTypes={nodeTypes}
								edgeTypes={edgeTypes}
								onConnect={onConnect}
								onNodesDelete={onNodesDelete}
								fitView
								fitViewOptions={{
									padding: 0.2,
								}}
								defaultEdgeOptions={{
									animated: true,
								}}
								colorMode={colorMode}
							>
								<Panel position="top-left">
									<h2>{currentWorkflow.name}</h2>
								</Panel>
								<Panel position="top-right">
									<Button onClick={() => onLayout("DOWN")}>
										Vertical layout
									</Button>
									<Button onClick={() => onLayout("RIGHT")}>
										Horizontal layout
									</Button>
								</Panel>
								<Background />
								<MiniMap />
								<Controls showInteractive={false} />
							</ReactFlow>
						</div>
					}
				>
					<ContextMenuContent>
						{menuNodeId ? (
							<>
								<ContextMenuItem
									onClick={() => {
										setNodeDialogId(menuNodeId);
										toggleNodeDialog(true);
									}}
								>
									Edit
								</ContextMenuItem>
								<ContextMenuItem>Lock</ContextMenuItem>
								<ContextMenuSeparator />
								<ContextMenuItem
									variant="destructive"
									onClick={() =>
										deleteElements({ nodes: [{ id: menuNodeId }] })
									}
								>
									Delete
								</ContextMenuItem>
							</>
						) : (
							<ContextMenuItem disabled>Select a node</ContextMenuItem>
						)}
					</ContextMenuContent>
				</ContextMenuTrigger>
			</ContextMenu>

			<EditEmailNode />
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
