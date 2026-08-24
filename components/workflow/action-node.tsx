import { Handle, type NodeProps, Position } from "@xyflow/react";
import {
	Bell,
	ClipboardCheck,
	ClipboardList,
	Mail,
	MessageSquareText,
} from "lucide-react";
import type { ReactNode } from "react";
import { Separator } from "../ui/separator";
import type { ActionNodeType, ActionType } from "./types";

export function ActionNode({ id, data }: NodeProps<ActionNodeType>) {
	const IconByType: Record<ActionType, ReactNode> = {
		email: <Mail />,
		notification: <Bell />,
		"interview guide": <MessageSquareText />,
		questionnaire: <ClipboardList />,
		task: <ClipboardCheck />,
	};

	return (
		<div
			className="flex flex-row items-center justify-between gap-2 rounded-lg border bg-background p-2 text-sm"
			id={id}
		>
			<Handle type="target" position={Position.Top} />
			{IconByType[data.actionType]}
			<Separator orientation="vertical" />
			<div className="font-medium">{data.actionTitle}</div>
			<Handle type="source" position={Position.Bottom} />
		</div>
	);
}
