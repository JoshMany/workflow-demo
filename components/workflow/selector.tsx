"use client";

import { Ellipsis, MoreHorizontalIcon, Plus, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useWorkflowStore } from "@/providers/workflow-store-provider";
import { Button } from "../ui/button";
import { ButtonGroup } from "../ui/button-group";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Separator } from "../ui/separator";
import RenameWorkflowForm from "./forms/renameWorkflow";

export default function WorkflowSelector() {
	const { Workflows, createWorkflow, selectWorkflow } = useWorkflowStore(
		(store) => store,
	);
	const [activeWorkflow, setActiveWorkflow] = useState<string>("0");
	const [isRenameDialogOpen, setIsRenameDialogOpen] = useState<boolean>(false);
	const [relatedDialogUUID, setRelatedDialogUUID] = useState<string>("");

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

			<ButtonGroup
				orientation={"vertical"}
				className="w-full h-fit"
				aria-label="Workflow Selection"
			>
				{Object.entries(Workflows).map(([uuid, workflow]) => (
					<ButtonGroup
						className="flex flex-1 w-full min-w-full"
						key={`wrapper-${uuid}`}
					>
						<Button
							key={uuid}
							variant={activeWorkflow === uuid ? "outline" : "ghost"}
							size={"lg"}
							onClick={() => {
								if (activeWorkflow === uuid) return;
								setActiveWorkflow(uuid);
								selectWorkflow(uuid);
							}}
							className="flex-1 justify-start"
						>
							{workflow.name}
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										variant={activeWorkflow === uuid ? "outline" : "ghost"}
										size="icon-lg"
										aria-label="Options"
									>
										<Ellipsis />
									</Button>
								}
							/>
							<DropdownMenuContent align="end" className="w-40">
								<DropdownMenuGroup>
									<DropdownMenuItem
										onClick={() => {
											setIsRenameDialogOpen(true);
											setRelatedDialogUUID(uuid);
										}}
										disabled={uuid === "0"}
									>
										Rename
									</DropdownMenuItem>
									<DropdownMenuItem>Duplicate</DropdownMenuItem>
									<DropdownMenuItem>Run simulation</DropdownMenuItem>
								</DropdownMenuGroup>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuItem variant="destructive">
										<Trash2Icon />
										Delete
									</DropdownMenuItem>
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</ButtonGroup>
				))}
			</ButtonGroup>

			<RenameWorkflowForm
				uuid={relatedDialogUUID}
				isOpen={isRenameDialogOpen}
				setIsOpen={setIsRenameDialogOpen}
			/>
		</div>
	);
}
