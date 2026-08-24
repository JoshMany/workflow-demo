"use client";

import { Ellipsis, Plus } from "lucide-react";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useWorkflowStore } from "@/providers/workflow-store-provider";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import { WorkflowItemType } from "./types";

export default function WorkflowSelector() {
	const { Workflows, createWorkflow, selectWorkflow } = useWorkflowStore(
		(store) => store,
	);
	const [activeWorkflow, setActiveWorkflow] = useState(Workflows[0].UUID);

	return (
		<div className="h-full w-fit min-w-3xs max-w-sm">
			<Button
				variant={"default"}
				className={"w-full"}
				size={"lg"}
				onClick={createWorkflow}
			>
				<Plus data-icon="inline-start" /> New Workflow
			</Button>
			<Separator className="my-3" />
			<ToggleGroup
				orientation="vertical"
				value={[activeWorkflow]}
				onValueChange={(value) => {
					if (value.length) {
						setActiveWorkflow(value[0]);
						selectWorkflow(value[0]);
					}
				}}
				size={"lg"}
				className={"w-full text-start"}
			>
				{Workflows.map((workflow: WorkflowItemType) => (
					<ToggleGroupItem
						value={workflow.UUID}
						key={workflow.UUID}
						size={"lg"}
						className={"flex flex-row justify-between"}
						render={
							<div>
								<span className="w-fit font-bold text-sm">{workflow.name}</span>
								<DropdownMenu>
									<DropdownMenuTrigger
										render={
											<Button variant="ghost" size={"icon"} className={"z-10"}>
												<Ellipsis />
											</Button>
										}
									/>
									<DropdownMenuContent className="w-40" align="start">
										<DropdownMenuGroup>
											<DropdownMenuItem>Rename</DropdownMenuItem>
											<DropdownMenuItem>Run Simulation</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem variant="destructive">
												Delete
											</DropdownMenuItem>
										</DropdownMenuGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						}
					/>
				))}
			</ToggleGroup>
		</div>
	);
}
