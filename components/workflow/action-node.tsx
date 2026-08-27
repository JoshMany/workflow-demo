import { Dialog } from "@base-ui/react";
import { Handle, type NodeProps, Position } from "@xyflow/react";
import {
	Bell,
	ChevronsLeftRightEllipsis,
	ClipboardCheck,
	ClipboardList,
	Mail,
	MessageSquareText,
} from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { useDemoStore } from "@/providers/workflow-store-provider";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import EditEmailNode from "./forms/edit-email-node";
import type { ActionNodeType, ActionType } from "./types";

export function ActionNode({ id, data }: NodeProps<ActionNodeType>) {
	const IconByType: Record<ActionType, ReactNode> = {
		email: <Mail />,
		internal_notification: <Bell />,
		interview: <MessageSquareText />,
		questionnaire: <ClipboardList />,
		manual_task: <ClipboardCheck />,
		condition: <ChevronsLeftRightEllipsis />,
	};

	const {
		CurrentWorkflowUUID,
		Workflows,
		OpenMenuNodeId,
		toggleNodeMenu,
		closeNodeMenu,
		toggleNodeDialog,
		setNodeDialogId,
	} = useDemoStore((state) => state);
	const currentWorkflow = Workflows[CurrentWorkflowUUID];
	const is_default = currentWorkflow?.config?.is_default || false;

	const isOpen = OpenMenuNodeId === id;
	const pressStartRef = useRef<{ x: number; y: number } | null>(null);
	const DRAG_THRESHOLD = 5;

	const toggleDialog = () => {
		setNodeDialogId(id);
		toggleNodeDialog(true);
	};

	return (
		<DropdownMenu
			open={isOpen}
			modal={false}
			onOpenChange={(open) => (open ? toggleNodeMenu(id) : closeNodeMenu(id))}
		>
			<DropdownMenuTrigger
				render={
					<button
						className="flex flex-row items-center justify-between gap-2 rounded-lg border bg-background p-2 text-sm cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
						id={id}
						type="button"
						onPointerDown={(e) => {
							pressStartRef.current = { x: e.clientX, y: e.clientY };
						}}
						onPointerUp={(e) => {
							const start = pressStartRef.current;
							pressStartRef.current = null;
							if (!start) return;

							const dx = e.clientX - start.x;
							const dy = e.clientY - start.y;

							if (
								Math.abs(dx) < DRAG_THRESHOLD &&
								Math.abs(dy) < DRAG_THRESHOLD
							) {
								e.stopPropagation();
								toggleNodeMenu(id);
							}
						}}
						onClick={(e) => e.stopPropagation()}
					/>
				}
			>
				<Handle type="target" position={Position.Top} />
				<Handle type="source" position={Position.Bottom} />

				<div className="flex items-center gap-2 pointer-events-none">
					{IconByType[data.actionType]}
					<Separator orientation="vertical" />
					<span className="font-medium">{data.actionTitle}</span>
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent className={"w-fit"} align="center">
				<DropdownMenuItem onClick={toggleDialog}>Edit</DropdownMenuItem>
				<DropdownMenuItem>Lock</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
