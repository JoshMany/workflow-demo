"use client";

import { useForm, useSelector } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import * as z from "zod";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
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
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { computeQuestionnaireScore } from "@/lib/questionnaire-scoring";
import { useDemoStore } from "@/providers/workflow-store-provider";

const formSchema = z.object({
	title: z.string().min(1, "Title is required."),
	questionnaireUUID: z.string().min(1, "Select a questionnaire template."),
});

export default function EditQuestionnaireNode() {
	const router = useRouter();
	const {
		NodeDialogId,
		DialogState,
		setNodeDialogId,
		toggleNodeDialog,
		getNodeData,
		setNodeData,
		Questionnaires,
	} = useDemoStore(
		useShallow((state) => ({
			NodeDialogId: state.nodeDialogId,
			DialogState: state.openDialog,
			setNodeDialogId: state.setNodeDialogId,
			toggleNodeDialog: state.toggleNodeDialog,
			getNodeData: state.getNodeData,
			setNodeData: state.setNodeData,
			Questionnaires: state.Questionnaires,
		})),
	);

	const nodeData = getNodeData(NodeDialogId || "") || null;
	const isQuestionnaire = nodeData?.actionType === "questionnaire";
	const nodeConfig = isQuestionnaire ? nodeData.config : undefined;
	const templates = Object.entries(Questionnaires);

	const form = useForm({
		defaultValues: {
			title: nodeData?.actionTitle ?? "",
			questionnaireUUID: nodeConfig?.questionnaireUUID ?? "",
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			if (NodeDialogId)
				setNodeData(NodeDialogId, {
					actionTitle: value.title,
					actionType: "questionnaire",
					actionUUID: NodeDialogId,
					config: {
						questionnaireUUID: value.questionnaireUUID,
					},
				});
			toast.add({
				title: "Done",
			});
		},
	});

	const templateValue = useSelector(
		form.store,
		(state) => state.values.questionnaireUUID,
	);
	const selectedTemplate = templateValue
		? Questionnaires[templateValue]
		: undefined;

	// Al abrir el diálogo (o cambiar de nodo), el formulario se reinicia con los
	// valores actuales del nodo seleccionado.
	useEffect(() => {
		if (!DialogState || !NodeDialogId) return;

		const data = getNodeData(NodeDialogId);
		form.reset({
			title: data?.actionTitle ?? "",
			questionnaireUUID:
				data?.actionType === "questionnaire"
					? data.config.questionnaireUUID
					: "",
		});
	}, [DialogState, NodeDialogId, getNodeData, form]);

	const toggleModal = (open: boolean) => {
		setNodeDialogId(open ? NodeDialogId : null);
		toggleNodeDialog(open);

		if (!open) form.reset();
	};

	return (
		<Dialog open={DialogState && isQuestionnaire} onOpenChange={toggleModal}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Questionnaire</DialogTitle>
					<DialogDescription>
						Pick which questionnaire template this node sends.
					</DialogDescription>
				</DialogHeader>
				<form
					id="questionnaire-node-edit-form"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.Field name="title">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Action Title</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder="Action title"
											autoComplete="off"
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						<form.Field name="questionnaireUUID">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>
											Questionnaire template
										</FieldLabel>
										{templates.length === 0 ? (
											<div className="flex flex-col items-start gap-2">
												<p className="text-xs text-muted-foreground">
													There are no questionnaire templates yet. Create one
													first, then come back to link it to this node.
												</p>
												<Button
													variant="outline"
													size="sm"
													type="button"
													onClick={() => router.push("/questionnaires")}
												>
													Go to Questionnaires
												</Button>
											</div>
										) : (
											<>
												<Select
													name={field.name}
													value={field.state.value}
													onValueChange={(value) =>
														field.handleChange(value ?? "")
													}
												>
													<SelectTrigger
														aria-invalid={isInvalid}
														id={field.name}
													>
														<SelectValue placeholder="Select a template" />
													</SelectTrigger>
													<SelectContent>
														{templates.map(([uuid, questionnaire]) => (
															<SelectItem key={uuid} value={uuid}>
																{questionnaire.name}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												{selectedTemplate ? (
													<FieldDescription>
														{(() => {
															const stats = computeQuestionnaireScore(
																selectedTemplate,
																{},
															);
															return `${stats.totalQuestions} question${
																stats.totalQuestions === 1 ? "" : "s"
															} · ${stats.maxScore} pt${
																stats.maxScore === 1 ? "" : "s"
															}${
																selectedTemplate.scoring?.enabled
																	? ` · pass ≥ ${selectedTemplate.scoring.passThreshold}%`
																	: ""
															}`;
														})()}
													</FieldDescription>
												) : (
													field.state.value !== "" && (
														<p className="text-xs font-medium text-destructive">
															This template no longer exists. Choose another.
														</p>
													)
												)}
												{isInvalid && (
													<FieldError errors={field.state.meta.errors} />
												)}
											</>
										)}
									</Field>
								);
							}}
						</form.Field>
					</FieldGroup>

					<DialogFooter>
						<DialogClose render={<Button variant="outline">Cancel</Button>} />
						<Button type="submit" disabled={templates.length === 0}>
							Save changes
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
