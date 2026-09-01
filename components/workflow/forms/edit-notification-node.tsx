"use client";

import { useForm } from "@tanstack/react-form";
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
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useDemoStore } from "@/providers/workflow-store-provider";

const formSchema = z.object({
	title: z.string().min(1, "Title is required."),
	body: z.string().min(1, "Content is required."),
});

export default function EditNotificationNode() {
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
	const isNotification = nodeData?.actionType === "internal_notification";
	const nodeConfig = isNotification ? nodeData.config : undefined;

	const form = useForm({
		defaultValues: {
			title: nodeData?.actionTitle ?? "",
			body: nodeConfig?.body ?? "",
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			if (NodeDialogId)
				setNodeData(NodeDialogId, {
					actionTitle: value.title,
					actionType: "internal_notification",
					actionUUID: NodeDialogId,
					config: {
						body: value.body,
					},
				});
			toast.add({
				title: "Done",
			});
		},
	});

	// Al abrir el diálogo (o cambiar de nodo), el formulario se reinicia con los
	// valores actuales del nodo seleccionado. Sin esto, @tanstack/react-form
	// conservaría los defaults del primer montaje.
	useEffect(() => {
		if (!DialogState || !NodeDialogId) return;

		const data = getNodeData(NodeDialogId);
		form.reset({
			title: data?.actionTitle ?? "",
			body:
				data?.actionType === "internal_notification" ? data.config.body : "",
		});
	}, [DialogState, NodeDialogId, getNodeData, form]);

	const toggleModal = (open: boolean) => {
		setNodeDialogId(open ? NodeDialogId : null);
		toggleNodeDialog(open);

		if (!open) form.reset();
	};

	return (
		<Dialog open={DialogState && isNotification} onOpenChange={toggleModal}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Notification</DialogTitle>
					<DialogDescription>
						Edit the internal notification details of this node.
					</DialogDescription>
				</DialogHeader>
				<form
					id="notification-node-edit-form"
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

						<form.Field name="body">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>
											Notification body
										</FieldLabel>
										<Textarea
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>
					</FieldGroup>
				</form>
				<DialogFooter>
					<DialogClose>Cancel</DialogClose>
					<Button type="submit" form="notification-node-edit-form">
						Save changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
