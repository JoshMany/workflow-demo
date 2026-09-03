"use client";

import {
	Copy,
	Ellipsis,
	Plus,
	SearchIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import { computeQuestionnaireScore } from "@/lib/questionnaire-scoring";
import { useDemoStore } from "@/providers/workflow-store-provider";
import type { QuestionnaireItemType } from "@/store/questionnaireSlice";
import RenameQuestionnaireForm from "./forms/rename-questionnaire";

export default function QuestionnaireSelector() {
	const {
		Questionnaires,
		CurrentQuestionnaireUUID,
		createQuestionnaire,
		selectQuestionnaire,
		duplicateQuestionnaire,
		removeQuestionnaire,
		restoreQuestionnaire,
	} = useDemoStore(
		useShallow((state) => ({
			Questionnaires: state.Questionnaires,
			CurrentQuestionnaireUUID: state.CurrentQuestionnaireUUID,
			createQuestionnaire: state.createQuestionnaire,
			selectQuestionnaire: state.selectQuestionnaire,
			duplicateQuestionnaire: state.duplicateQuestionnaire,
			removeQuestionnaire: state.removeQuestionnaire,
			restoreQuestionnaire: state.restoreQuestionnaire,
		})),
	);

	const [renameOpen, setRenameOpen] = useState(false);
	const [relatedUUID, setRelatedUUID] = useState("");
	const [query, setQuery] = useState("");
	const [deleteTarget, setDeleteTarget] = useState<{
		uuid: string;
		name: string;
	} | null>(null);

	// Snapshot del borrado para poder deshacerlo (item + posición + estado activo).
	const deletedSnapshot = useRef<{
		uuid: string;
		item: QuestionnaireItemType;
		index: number;
		wasActive: boolean;
	} | null>(null);

	const confirmDelete = () => {
		if (!deleteTarget) return;
		const { uuid } = deleteTarget;
		const entry = Questionnaires[uuid];
		if (!entry) return;

		const index = Object.keys(Questionnaires).indexOf(uuid);
		deletedSnapshot.current = {
			uuid,
			item: JSON.parse(JSON.stringify(entry)) as QuestionnaireItemType,
			index,
			wasActive: uuid === CurrentQuestionnaireUUID,
		};

		removeQuestionnaire(uuid);
		setDeleteTarget(null);

		toast.add({
			title: "Template deleted.",
			description: `"${deleteTarget.name}" was removed. You can undo this action.`,
			actionProps: {
				children: "Undo",
				onClick: undoDelete,
			},
		});
	};

	const undoDelete = () => {
		const snapshot = deletedSnapshot.current;
		if (!snapshot) return;
		deletedSnapshot.current = null;

		restoreQuestionnaire(snapshot.uuid, snapshot.item, snapshot.index);
		if (snapshot.wasActive) {
			selectQuestionnaire(snapshot.uuid);
		}

		toast.add({
			title: "Template restored.",
			description: `"${snapshot.item.name}" is back where it was.`,
		});
	};

	const entries = Object.entries(Questionnaires);
	const normalizedQuery = query.trim().toLowerCase();
	const filtered = normalizedQuery
		? entries.filter(([, questionnaire]) => {
				const haystack = [
					questionnaire.name,
					questionnaire.description ?? "",
					...questionnaire.Sections.flatMap((section) => [
						section.title ?? "",
						section.description ?? "",
						...section.Questions.map((question) => question.prompt),
					]),
				]
					.join(" ")
					.toLowerCase();
				return haystack.includes(normalizedQuery);
			})
		: entries;

	return (
		<div className="h-full w-fit min-w-3xs max-w-sm">
			<Button
				variant="default"
				size="lg"
				className="w-full"
				onClick={createQuestionnaire}
			>
				<Plus data-icon="inline-start" /> New template
			</Button>
			<Separator className="my-3" />

			{/* Search */}
			<div className="relative mb-1.5">
				<SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search templates…"
					className="h-7 pr-7 pl-7"
					aria-label="Search templates"
				/>
				{query && (
					<button
						type="button"
						onClick={() => setQuery("")}
						aria-label="Clear search"
						className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
					>
						<XIcon className="size-3.5" />
					</button>
				)}
			</div>

			<p className="mb-1.5 text-xs text-muted-foreground" aria-live="polite">
				{filtered.length} of {entries.length} template
				{entries.length === 1 ? "" : "s"}
			</p>

			<ButtonGroup
				orientation="vertical"
				className="h-fit w-full"
				aria-label="Questionnaire templates"
			>
				{filtered.map(([uuid, questionnaire]) => {
					const isActive = uuid === CurrentQuestionnaireUUID;
					const stats = computeQuestionnaireScore(questionnaire, {});
					const scoring = questionnaire.scoring;
					const metaParts = [
						`${stats.totalQuestions} question${stats.totalQuestions === 1 ? "" : "s"}`,
						`${stats.maxScore} pt${stats.maxScore === 1 ? "" : "s"}`,
					];
					if (scoring?.enabled) {
						metaParts.push(`pass ≥ ${scoring.passThreshold}%`);
					}
					const meta = metaParts.join(" · ");
					return (
						<ButtonGroup className="flex w-full min-w-full flex-1" key={uuid}>
							<Button
								variant={isActive ? "outline" : "ghost"}
								size="lg"
								className="h-auto min-h-11 flex-1 flex-col items-start justify-center gap-0.5 py-2"
								onClick={() => {
									if (isActive) return;
									selectQuestionnaire(uuid);
								}}
							>
								<span className="w-full truncate text-left font-medium">
									{questionnaire.name}
								</span>
								<span className="w-full truncate text-left text-xs font-normal text-muted-foreground">
									{meta}
								</span>
							</Button>
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											variant={isActive ? "outline" : "ghost"}
											size="icon-lg"
											aria-label="Template options"
										>
											<Ellipsis />
										</Button>
									}
								/>
								<DropdownMenuContent align="end" className="w-44">
									<DropdownMenuGroup>
										<DropdownMenuItem
											onClick={() => {
												setRelatedUUID(uuid);
												setRenameOpen(true);
											}}
										>
											Rename
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => {
												duplicateQuestionnaire(uuid);
												toast.add({ title: "Template duplicated." });
											}}
										>
											<Copy /> Duplicate
										</DropdownMenuItem>
									</DropdownMenuGroup>
									<DropdownMenuSeparator />
									<DropdownMenuGroup>
										<DropdownMenuItem
											variant="destructive"
											onClick={() =>
												setDeleteTarget({ uuid, name: questionnaire.name })
											}
										>
											<Trash2Icon /> Delete
										</DropdownMenuItem>
									</DropdownMenuGroup>
								</DropdownMenuContent>
							</DropdownMenu>
						</ButtonGroup>
					);
				})}
			</ButtonGroup>

			<RenameQuestionnaireForm
				uuid={relatedUUID}
				isOpen={renameOpen}
				setIsOpen={setRenameOpen}
			/>

			<Dialog
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteTarget(null);
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Delete template</DialogTitle>
						<DialogDescription>
							You are about to delete "{deleteTarget?.name}". You can undo this
							action from the notification.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose render={<Button variant="outline">Cancel</Button>} />
						<Button variant="destructive" onClick={confirmDelete}>
							<Trash2Icon /> Delete template
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
