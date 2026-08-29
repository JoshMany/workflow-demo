import { Handle, type NodeProps, Position } from "@xyflow/react";
import {
	Bell,
	ChevronsLeftRightEllipsis,
	ClipboardCheck,
	ClipboardList,
	Mail,
	MessageSquareText,
} from "lucide-react";
import type { ReactNode } from "react";
import { Separator } from "../ui/separator";
import type { ActionNodeType, ActionType } from "./types";

export function ActionNode({ data }: NodeProps<ActionNodeType>) {
	const IconByType: Record<ActionType, ReactNode> = {
		email: <Mail />,
		internal_notification: <Bell />,
		interview: <MessageSquareText />,
		questionnaire: <ClipboardList />,
		manual_task: <ClipboardCheck />,
		condition: <ChevronsLeftRightEllipsis />,
	};

	return (
		<div className="flex flex-row items-center justify-between gap-2 rounded-lg border bg-background p-2 text-sm cursor-pointer select-none">
			<Handle type="target" position={Position.Top} />
			<Handle type="source" position={Position.Bottom} />

			<div className="flex items-center gap-2 pointer-events-none">
				{IconByType[data.actionType]}
				<Separator orientation="vertical" />
				<span className="font-medium">{data.actionTitle}</span>
			</div>
		</div>
	);
}
