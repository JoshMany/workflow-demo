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
import type { ConditionBranch, ConditionOperator } from "@/store/flowSlice";

const BRANCH_OPTIONS: { value: ConditionBranch; label: string }[] = [
	{ value: "positive", label: "Yes — rule is met (positive)" },
	{ value: "negative", label: "No — rule is not met (negative)" },
];

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
	{ value: "greater_than_or_equal", label: "Greater than or equal to (≥)" },
	{ value: "less_than", label: "Less than (<)" },
];

//* Frase legible que resume la regla de la arista. Se usa como descripción
//* cuando el usuario deja la suya en blanco.
function buildRuleSummary(
	branch: ConditionBranch,
	operator: ConditionOperator,
	value: number,
): string {
	const comparison =
		operator === "greater_than_or_equal"
			? "is greater than or equal to"
			: "is less than";
	const prefix = branch === "positive" ? "Yes" : "No";

	return `${prefix}: continue when the score ${comparison} ${value}.`;
}

const formSchema = z.object({
	branch: z.enum(["positive", "negative"]),
	operator: z.enum(["greater_than_or_equal", "less_than"]),
	value: z.string().regex(/^\d+(\.\d+)?$/, "Enter a valid number (e.g. 60)."),
	//* Vacía → se autogenera a partir de la rama y la regla en el guardado.
	description: z.string(),
});

export default function EditConditionEdge() {
	const {
		EdgeDialogId,
		EdgeDialogState,
		EdgeDialogIsNew,
		setEdgeDialogId,
		toggleEdgeDialog,
		setEdgeDialogIsNew,
		getEdgeData,
		setEdgeData,
		removeEdge,
	} = useDemoStore(
		useShallow((state) => ({
			EdgeDialogId: state.edgeDialogId,
			EdgeDialogState: state.openEdgeDialog,
			EdgeDialogIsNew: state.edgeDialogIsNew,
			setEdgeDialogId: state.setEdgeDialogId,
			toggleEdgeDialog: state.toggleEdgeDialog,
			setEdgeDialogIsNew: state.setEdgeDialogIsNew,
			getEdgeData: state.getEdgeData,
			setEdgeData: state.setEdgeData,
			removeEdge: state.removeEdge,
		})),
	);

	const edgeData = getEdgeData(EdgeDialogId || "") || null;
	const isConditionEdge = edgeData?.transitionType === "condition";
	const condition = isConditionEdge ? edgeData.condition : undefined;

	const form = useForm({
		defaultValues: {
			branch: condition?.branch ?? "positive",
			operator: condition?.operator ?? "greater_than_or_equal",
			value: condition?.value !== undefined ? String(condition.value) : "60",
			description: condition?.description ?? "",
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			if (!EdgeDialogId) return;

			const current = getEdgeData(EdgeDialogId);
			const threshold = Number(value.value);
			setEdgeData(EdgeDialogId, {
				transitionUUID: current?.transitionUUID ?? EdgeDialogId,
				transitionType: "condition",
				condition: {
					branch: value.branch,
					operator: value.operator,
					value: threshold,
					description:
						value.description.trim() ||
						buildRuleSummary(value.branch, value.operator, threshold),
				},
			});

			// Ya está configurada: cerrar sin eliminar la arista.
			setEdgeDialogIsNew(false);
			setEdgeDialogId(null);
			toggleEdgeDialog(false);
			toast.add({
				title: "Done",
			});
		},
	});

	const branch = useSelector(form.store, (state) => state.values.branch);
	const operator = useSelector(form.store, (state) => state.values.operator);
	const value = useSelector(form.store, (state) => state.values.value);
	const description = useSelector(
		form.store,
		(state) => state.values.description,
	);

	const previewText =
		description.trim() ||
		buildRuleSummary(branch, operator, Number(value) || 0);

	// Al abrir el diálogo (o cambiar de arista), el formulario se reinicia con los
	// valores actuales de la arista seleccionada.
	useEffect(() => {
		if (!EdgeDialogState || !EdgeDialogId) return;

		const data = getEdgeData(EdgeDialogId);
		const config =
			data?.transitionType === "condition" ? data.condition : undefined;
		form.reset({
			branch: config?.branch ?? "positive",
			operator: config?.operator ?? "greater_than_or_equal",
			value: config?.value !== undefined ? String(config.value) : "60",
			description: config?.description ?? "",
		});
	}, [EdgeDialogState, EdgeDialogId, getEdgeData, form]);

	const toggleModal = (open: boolean) => {
		toggleEdgeDialog(open);

		if (!open) {
			// Si era una arista recién creada y no se guardó, se descarta.
			if (EdgeDialogIsNew && EdgeDialogId) removeEdge(EdgeDialogId);
			setEdgeDialogId(null);
			setEdgeDialogIsNew(false);
			form.reset();
		}
	};

	return (
		<Dialog
			open={EdgeDialogState && isConditionEdge}
			onOpenChange={toggleModal}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{EdgeDialogIsNew
							? "Configure Condition Edge"
							: "Edit Condition Edge"}
					</DialogTitle>
					<DialogDescription>
						Decide whether this edge is the Yes (positive) or No (negative)
						branch of the Condition node, and the rule it evaluates.
					</DialogDescription>
				</DialogHeader>
				<form
					id="condition-edge-edit-form"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.Field name="branch">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Branch</FieldLabel>
										<Select
											name={field.name}
											value={field.state.value}
											onValueChange={(next) =>
												field.handleChange(
													(next ?? "positive") as ConditionBranch,
												)
											}
										>
											<SelectTrigger aria-invalid={isInvalid} id={field.name}>
												<SelectValue placeholder="Branch" />
											</SelectTrigger>
											<SelectContent>
												{BRANCH_OPTIONS.map((option) => (
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
											The score the result must meet for this branch to trigger.
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
										placeholder="e.g. Questionnaire score >= 60%"
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
					<Button type="submit" form="condition-edge-edit-form">
						Save changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
