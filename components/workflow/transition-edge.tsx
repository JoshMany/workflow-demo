import {
	BaseEdge,
	EdgeLabelRenderer,
	type EdgeProps,
	getBezierPath,
	useReactFlow,
} from "@xyflow/react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	type ActionType,
	buildTransitionDescription,
} from "@/components/workflow/transition-description";
import { Button } from "../ui/button";
import type { TransitionEdgeType, transitionTypes } from "./types";

export default function TransitionEdge({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	data,
	markerEnd,
	source,
	target,
}: EdgeProps<TransitionEdgeType>) {
	const [edgePath, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
	});

	const { getNode } = useReactFlow();

	const sourceNode = getNode(source);
	const targetNode = getNode(target);

	const LabelByType: Record<transitionTypes, string> = {
		immediate: "Immediate",
		delayed: "Delayed",
		conditional: "Conditional",
	};

	const description =
		sourceNode && targetNode
			? buildTransitionDescription({
					sourceAction: {
						title: sourceNode.data.actionTitle as string,
						type: sourceNode.data.actionType as ActionType,
					},
					targetAction: {
						title: targetNode.data.actionTitle as string,
						type: targetNode.data.actionType as ActionType,
					},
					transitionType: data?.transitionType ?? "immediate",
				})
			: "";

	return (
		<>
			<BaseEdge id={id} path={edgePath} markerEnd={markerEnd} />

			<EdgeLabelRenderer>
				<Popover>
					<PopoverTrigger
						render={
							<Button
								variant="default"
								className="absolute pointer-events-auto cursor-pointer nodrag nopane transition-none"
								style={{
									transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
								}}
							>
								{LabelByType[data?.transitionType ?? "immediate"]}
							</Button>
						}
					/>
					<PopoverContent className="w-80">
						<div className="grid gap-4">
							<div className="space-y-2">
								<h4 className="leading-none font-medium">
									Transtition Details:
								</h4>
								<p>{description}</p>
							</div>
						</div>
					</PopoverContent>
				</Popover>
			</EdgeLabelRenderer>
		</>
	);
}
