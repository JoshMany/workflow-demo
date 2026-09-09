"use client";

import { useForm, useSelector } from "@tanstack/react-form";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useDemoStore } from "@/providers/workflow-store-provider";
import type { ConditionOperator } from "@/store/flowSlice";

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
	{ value: "greater_than_or_equal", label: "Greater than or equal to (≥)" },
	{ value: "less_than", label: "Less than (<)" },
];

//* Frase legible que resume la regla estructurada (operator + value). Se usa
//* como descripción cuando el usuario deja la suya en blanco.
function buildRuleSummary(operator: ConditionOperator, value: number): string {
	const comparison =
		operator === "greater_than_or_equal"
			? "is greater than or equal to"
			: "is less than";

	return `Continue when the score ${comparison} ${value}.`;
}

const formSchema = z.object({
	title: z.string().min(1, "Title is required."),
	operator: z.enum(["greater_than_or_equal", "less_than"]),
	value: z.string().regex(/^\d+(\.\d+)?$/, "Enter a valid number (e.g. 60)."),
	//* Vacía → se autogenera a partir de la regla en el guardado.
	description: z.string(),
});

export default function EditConditionNode() {
	const {
		NodeDialogId,
		DialogState,
		setNodeDialogId,
		toggleNodeDialog,
		getNodeData,
		setNodeData,
	} = useDemoStore(
		useShallow((state) => ({
			NodeDialogId: state.nodeDialogId,
			DialogState: state.openDialog,
			setNodeDialogId: state.setNodeDialogId,
			toggleNodeDialog: state.toggleNodeDialog,
			getNodeData: state.getNodeData,
			setNodeData: state.setNodeData,
		})),
	);

	const nodeData = getNodeData(NodeDialogId || "") || null;
	const isCondition = nodeData?.actionType === "condition";
	const nodeConfig = isCondition ? nodeData.config : undefined;

	const form = useForm({
		defaultValues: {
			title: nodeData?.actionTitle ?? "",
			operator: nodeConfig?.operator ?? "greater_than_or_equal",
			value: nodeConfig?.value !== undefined ? String(nodeConfig.value) : "60",
			description: nodeConfig?.description ?? "",
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			if (!NodeDialogId) return;

			const threshold = Number(value.value);
			setNodeData(NodeDialogId, {
				actionTitle: value.title,
				actionType: "condition",
				actionUUID: NodeDialogId,
				config: {
					operator: value.operator,
					value: threshold,
					description:
						value.description?.trim() ||
						buildRuleSummary(value.operator, threshold),
				},
			});
			toast.add({
				title: "Done",
			});
		},
	});

	const operator = useSelector(form.store, (state) => state.values.operator);
	const value = useSelector(form.store, (state) => state.values.value);
	const description = useSelector(
		form.store,
		(state) => state.values.description,
	);

	const previewText =
		description.trim() || buildRuleSummary(operator, Number(value) || 0);

	// Al abrir el diálogo (o cambiar de nodo), el formulario se reinicia con los
	// valores actuales del nodo seleccionado.
	useEffect(() => {
		if (!DialogState || !NodeDialogId) return;

		const data = getNodeData(NodeDialogId);
		const config = data?.actionType === "condition" ? data.config : undefined;
		form.reset({
			title: data?.actionTitle ?? "",
			operator: config?.operator ?? "greater_than_or_equal",
			value: config?.value !== undefined ? String(config.value) : "60",
			description: config?.description ?? "",
		});
	}, [DialogState, NodeDialogId, getNodeData, form]);

	const toggleModal = (open: boolean) => {
		setNodeDialogId(open ? NodeDialogId : null);
		toggleNodeDialog(open);

		if (!open) form.reset();
	};

	return (
		<Dialog open={DialogState && isCondition} onOpenChange={toggleModal}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Condition</DialogTitle>
					<DialogDescription>
						Set the rule that decides which branch this node follows.
					</DialogDescription>
				</DialogHeader>
				<form
					id="condition-node-edit-form"
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

						<form.Field name="operator">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Operator</FieldLabel>
										<Select
											name={field.name}
											value={field.state.value}
											onValueChange={(next) =>
												field.handleChange(
													(next ??
														"greater_than_or_equal") as ConditionOperator,
												)
											}
										>
											<SelectTrigger aria-invalid={isInvalid} id={field.name}>
												<SelectValue placeholder="Operator" />
											</SelectTrigger>
											<SelectContent>
												{OPERATOR_OPTIONS.map((option) => (
													<SelectItem key={option.value} value={option.value}>
														{option.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						<form.Field name="value">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>
											Threshold value
										</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											type="number"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder="60"
											autoComplete="off"
										/>
										<FieldDescription>
											The score the result must meet to take this
											condition&apos;s pass branch.
										</FieldDescription>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						<form.Field name="description">
							{(field) => (
								<Field>
									<FieldLabel htmlFor={field.name}>Description</FieldLabel>
									<Textarea
										id={field.name}
										name={field.name}
										value={field.state.value}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="e.g. Questionnaire score must be greater than or equal to 60%."
									/>
									<FieldDescription>
										Optional. If left blank, the rule summary below is used.
									</FieldDescription>
								</Field>
							)}
						</form.Field>
					</FieldGroup>

					<div className="mt-3 rounded-lg border border-input/40 bg-muted/20 p-3 text-xs">
						<p className="mb-1 font-medium text-muted-foreground">
							{description.trim() ? "Rule summary" : "Generated from the rule"}
						</p>
						<p className="text-foreground">{previewText}</p>
					</div>
				</form>
				<DialogFooter>
					<DialogClose>Cancel</DialogClose>
					<Button type="submit" form="condition-node-edit-form">
						Save changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
