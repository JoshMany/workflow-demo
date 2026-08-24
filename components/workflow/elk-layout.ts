import { Position } from "@xyflow/react";
import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkExtendedEdge, LayoutOptions } from "elkjs/lib/elk-api";
import type {
	ActionNodeType,
	TransitionEdgeType,
} from "@/components/workflow/types";

const elk = new ELK();

const elkOptions: LayoutOptions = {
	"elk.algorithm": "layered",
	"elk.layered.spacing.nodeNodeBetweenLayers": "100",
	"elk.spacing.nodeNode": "50",
};

export async function getLayoutedNodes(
	nodes: ActionNodeType[],
	edges: TransitionEdgeType[],
	options: LayoutOptions = {},
): Promise<ActionNodeType[]> {
	const isHorizontal = options["elk.direction"] === "RIGHT";

	const children = nodes.map((node) => {
		const width = node.measured?.width;
		const height = node.measured?.height;

		if (width == null || height == null) {
			throw new Error(`Node "${node.id}" has not been measured yet.`);
		}

		return {
			id: node.id,
			width,
			height,
		};
	});

	const graph = {
		id: "root",

		layoutOptions: {
			...elkOptions,
			...options,
		},

		children,

		edges: edges.map<ElkExtendedEdge>((edge) => ({
			id: edge.id,
			sources: [edge.source],
			targets: [edge.target],
		})),
	};

	const layoutedGraph = await elk.layout(graph);

	const positions = new Map(
		layoutedGraph.children?.map((node) => [
			node.id,
			{
				x: node.x ?? 0,
				y: node.y ?? 0,
			},
		]),
	);

	return nodes.map((node) => {
		const position = positions.get(node.id);

		if (!position) {
			return node;
		}

		return {
			...node,
			position,
			sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
			targetPosition: isHorizontal ? Position.Left : Position.Top,
		};
	});
}
