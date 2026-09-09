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
import { buildTransitionDescription } from "@/components/workflow/transition-description";
import type { ConditionBranch, ConditionOperator } from "@/store/flowSlice";
import { Button } from "../ui/button";
import type { ActionType, TransitionEdgeType, transitionTypes } from "./types";

//* Etiqueta y estilo del chip que muestra la rama de una arista `condition`.
const BRANCH_LABEL: Record<ConditionBranch, string> = {
	positive: "Yes",
	negative: "No",
};
const BRANCH_CHIP_CLASS: Record<ConditionBranch, string> = {
	positive:
		"!border-emerald-500/40 !bg-emerald-500/10 !text-emerald-700 hover:!bg-emerald-500/20 hover:!text-emerald-700 dark:!border-emerald-500/30 dark:!bg-emerald-500/15 dark:!text-emerald-400 dark:hover:!bg-emerald-500/25",
	negative:
		"!border-red-500/40 !bg-red-500/10 !text-red-700 hover:!bg-red-500/20 hover:!text-red-700 dark:!border-red-500/30 dark:!bg-red-500/15 dark:!text-red-400 dark:hover:!bg-red-500/25",
};

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
		time_delay: "Delayed",
		condition: "Conditional",
		event: "Event",
		manual: "Manual",
	};

	// Rama positiva (yes/pass) vs negativa (no/fail) de las aristas que salen de
	// un nodo Condition. Se lee del dato de la arista (`branch`); como fallback
	// para datos persistidos antiguos, se deriva comparando la regla de la arista
	// con la regla estructurada del nodo Condition origen.
	const conditionData =
		data?.transitionType === "condition" ? data.condition : undefined;

	let branch: ConditionBranch | undefined = conditionData?.branch;
	if (branch === undefined && conditionData && sourceNode) {
		const sourceData = sourceNode.data as unknown as
			| {
					actionType: ActionType;
					config: { operator: ConditionOperator; value: number };
			  }
			| undefined;
		if (sourceData?.actionType === "condition") {
			branch =
				sourceData.config.operator === conditionData.operator &&
				sourceData.config.value === conditionData.value
					? "positive"
					: "negative";
		}
	}

	const chipLabel = branch
		? BRANCH_LABEL[branch]
		: LabelByType[data?.transitionType ?? "immediate"];

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
					condition: conditionData
						? { description: conditionData.description }
						: undefined,
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
								className={`absolute pointer-events-auto cursor-pointer nodrag nopane transition-none ${
									branch ? BRANCH_CHIP_CLASS[branch] : ""
								}`}
								style={{
									transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
								}}
							>
								{branch && (
									<span
										aria-hidden
										className={`size-1.5 shrink-0 rounded-full ${
											branch === "positive"
												? "bg-emerald-500 dark:bg-emerald-400"
												: "bg-red-500 dark:bg-red-400"
										}`}
									/>
								)}
								{chipLabel}
							</Button>
						}
					/>
					<PopoverContent className="w-80">
						<div className="grid gap-4">
							<div className="space-y-2">
								<h4 className="leading-none font-medium">
									Transition Details:
								</h4>
								<p>{description}</p>
								{branch && (
									<p
										className={`text-xs font-medium ${
											branch === "positive"
												? "text-emerald-600 dark:text-emerald-400"
												: "text-red-600 dark:text-red-400"
										}`}
									>
										{branch === "positive"
											? "Positive branch — the condition is met."
											: "Negative branch — the condition is not met."}
									</p>
								)}
							</div>
						</div>
					</PopoverContent>
				</Popover>
			</EdgeLabelRenderer>
		</>
	);
}
