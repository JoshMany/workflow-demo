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
import {
	Bell,
	ChevronsLeftRightEllipsis,
	ClipboardCheck,
	ClipboardList,
	Mail,
	MessageSquareText,
	Plus,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLayoutedNodes } from "@/components/workflow/elk-layout";
import { useDemoStore } from "@/providers/workflow-store-provider";
import type {
	ActionNodeType,
	ActionType,
	TransitionEdgeType,
} from "@/store/flowSlice";
import EditEmailNode from "./forms/edit-email-node";
import EditNotificationNode from "./forms/edit-notification-node";
import EditQuestionnaireNode from "./forms/edit-questionnaire-node";

const ADD_ACTION_OPTIONS: {
	type: ActionType;
	label: string;
	icon: ReactNode;
}[] = [
	{ type: "email", label: "Email", icon: <Mail /> },
	{ type: "internal_notification", label: "Notification", icon: <Bell /> },
	{ type: "questionnaire", label: "Questionnaire", icon: <ClipboardList /> },
	{ type: "interview", label: "Interview", icon: <MessageSquareText /> },
	{ type: "manual_task", label: "Manual task", icon: <ClipboardCheck /> },
	{
		type: "condition",
		label: "Condition",
		icon: <ChevronsLeftRightEllipsis />,
	},
];

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
		addNode,
		onNodesDelete,
		setNodeDialogId,
		toggleNodeDialog,
		setWorkflowAutoLayout,
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
			addNode: state.addNode,
			setWorkflowAutoLayout: state.setWorkflowAutoLayout,
		})),
	);

	const currentWorkflow = Workflows[CurrentWorkflowUUID];

	const Nodes = currentWorkflow?.Nodes ?? [];
	const Edges = currentWorkflow?.Edges ?? [];

	// Refs con el grafo más reciente: permiten autolayout justo tras añadir un nodo
	// (el estado/ref ya se habrá actualizado cuando corra requestAnimationFrame).
	const nodesRef = useRef<ActionNodeType[]>(Nodes);
	const edgesRef = useRef<TransitionEdgeType[]>(Edges);
	useEffect(() => {
		nodesRef.current = Nodes;
		edgesRef.current = Edges;
	}, [Nodes, Edges]);

	const handleAddAction = (actionType: ActionType) => {
		addNode(actionType);
		requestAnimationFrame(async () => {
			const layouted = await getLayoutedNodes(
				nodesRef.current,
				edgesRef.current,
				{ "elk.direction": "DOWN" },
			);
			setNodes(layouted);
			setWorkflowAutoLayout(true);
			fitView({ padding: 0.2 });
		});
	};
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
			setWorkflowAutoLayout(true);

			requestAnimationFrame(() => {
				fitView({
					padding: 0.2,
				});
			});
		},
		[Nodes, Edges, setNodes, fitView, setWorkflowAutoLayout],
	);

	const wrapperRef = useRef<HTMLDivElement>(null);

	const [menu, setMenu] = useState<{
		id: string;
		x: number;
		y: number;
	} | null>(null);

	// En esta combinación (React 19 + React Flow v12) el evento sintético
	// `contextmenu` de React no llega a los handlers, así que usamos un listener
	// NATIVO sobre el contenedor y localizamos el nodo por su atributo `data-id`.
	useEffect(() => {
		const el = wrapperRef.current;
		if (!el) return;

		const onContextMenu = (event: globalThis.MouseEvent) => {
			event.preventDefault();

			const nodeEl = (event.target as HTMLElement)?.closest(
				".react-flow__node",
			);
			const id = nodeEl?.getAttribute("data-id");

			if (!id) {
				// Clic derecho sobre el lienzo: cierra el menú
				setMenu(null);
				return;
			}

			const MENU_WIDTH = 200;
			const MENU_HEIGHT = 130;
			setMenu({
				id,
				x: Math.min(event.clientX, window.innerWidth - MENU_WIDTH),
				y: Math.min(event.clientY, window.innerHeight - MENU_HEIGHT),
			});
		};

		el.addEventListener("contextmenu", onContextMenu);
		return () => el.removeEventListener("contextmenu", onContextMenu);
	}, []);

	// Cierra el menú al interactuar con el lienzo (clic, pan/zoom o arrastrar nodo)
	const closeMenu = useCallback(() => setMenu(null), []);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Auto-layout UNA sola vez por workflow: la primera carga aplica ELK y persiste
	// `autoLayoutApplied`. Así los reordenamientos manuales (drag de nodos, botones
	// de layout, conexiones de edges) quedan guardados y no se pisan al recargar.
	// biome-ignore lint/correctness/useExhaustiveDependencies: On mount
	useEffect(() => {
		if (!nodesInitialized) return;

		const workflow = currentWorkflow;
		if (!workflow || workflow.Nodes.length === 0) return;
		if (workflow.config?.autoLayoutApplied) return;

		onLayout("DOWN");
	}, [nodesInitialized]);

	return (
		<div className="flex flex-1 rounded-lg border bg-background">
			<div ref={wrapperRef} className="relative flex-1">
				<ReactFlow
					nodes={Nodes}
					edges={Edges}
					onNodesChange={onNodesChange}
					onPaneClick={closeMenu}
					onMoveStart={closeMenu}
					onNodeDragStart={closeMenu}
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
					<Panel
						position="top-right"
						className="flex flex-col items-end gap-1.5"
					>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button>
										<Plus data-icon="inline-start" /> Add action
									</Button>
								}
							/>
							<DropdownMenuContent align="end" className="w-48">
								<DropdownMenuGroup>
									{ADD_ACTION_OPTIONS.map((option) => (
										<DropdownMenuItem
											key={option.type}
											onClick={() => handleAddAction(option.type)}
										>
											{option.icon} {option.label}
										</DropdownMenuItem>
									))}
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
						<Button onClick={() => onLayout("DOWN")}>Vertical layout</Button>
						<Button onClick={() => onLayout("RIGHT")}>Horizontal layout</Button>
					</Panel>
					<Background />
					<MiniMap />
					<Controls showInteractive={false} />
				</ReactFlow>
			</div>

			{menu && (
				<div
					className="fixed z-50 min-w-32 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
					style={{ left: menu.x, top: menu.y }}
				>
					<button
						type="button"
						className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
						onClick={() => {
							setNodeDialogId(menu.id);
							toggleNodeDialog(true);
							setMenu(null);
						}}
					>
						Edit
					</button>
					<button
						type="button"
						className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
					>
						Lock
					</button>
					<div className="-mx-1 my-1 h-px bg-border/50" />
					<button
						type="button"
						className="flex w-full items-center rounded px-2 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
						onClick={() => {
							deleteElements({ nodes: [{ id: menu.id }] });
							setMenu(null);
						}}
					>
						Delete
					</button>
				</div>
			)}

			<EditEmailNode />
			<EditNotificationNode />
			<EditQuestionnaireNode />
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
