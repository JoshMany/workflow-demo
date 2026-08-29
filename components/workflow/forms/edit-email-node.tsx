"use client";

import { useForm, useSelector } from "@tanstack/react-form";
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
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { useDemoStore } from "@/providers/workflow-store-provider";

const formSchema = z
	.object({
		title: z.string().min(1, "Title is required."),
		recipient: z.enum(["candidate", "admin", "specific"]),
		recipientEmail: z.string().trim().email("Invalid email").or(z.literal("")),
		body: z.string().min(1, "Content is required."),
		relatedTrigger: z.string(),
		subject: z.string().min(1, "Subject is required."),
	})
	.superRefine((data, ctx) => {
		if (data.recipient === "specific" && !data.recipientEmail) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["recipientEmail"],
				message: "Email is required for an specific recipient.",
			});
		}
	});

export default function EditEmailNode() {
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
	const nodeConfig =
		nodeData?.actionType === "email" ? nodeData.config : undefined;

	const form = useForm({
		defaultValues: {
			title: nodeData?.actionTitle ?? "",
			recipient: nodeConfig?.recipient?.type ?? "candidate",
			recipientEmail:
				nodeConfig?.recipient?.type === "specific"
					? nodeConfig.recipient.email
					: "",
			body: nodeConfig?.body ?? "",
			relatedTrigger: nodeConfig?.trigger?.id ?? "",
			subject: nodeConfig?.subject ?? "",
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			if (NodeDialogId)
				setNodeData(NodeDialogId, {
					actionTitle: value.title,
					actionType: "email",
					actionUUID: NodeDialogId,
					config: {
						body: value.body,
						recipient:
							value.recipient === "candidate"
								? { type: "candidate" }
								: value.recipient === "admin"
									? { type: "admin" }
									: { type: "specific", email: value.recipientEmail },
						subject: value.subject,
						trigger: value.relatedTrigger
							? { id: value.relatedTrigger, type: "link_click" }
							: undefined,
					},
				});
			toast.add({
				title: "Done",
			});
		},
	});

	const recipientValue = useSelector(
		form.store,
		(state) => state.values.recipient,
	);

	const toggleModal = (open: boolean) => {
		setNodeDialogId(open ? NodeDialogId : null);
		toggleNodeDialog(open);

		if (!open) form.reset();
	};

	return (
		<Dialog open={DialogState} onOpenChange={toggleModal}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Email</DialogTitle>
					<DialogDescription>
						Edit the email action details of this node.
					</DialogDescription>
				</DialogHeader>
				<form
					id="email-node-edit-form"
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

						<form.Field name="subject">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Email subject</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder="Email subject"
											autoComplete="off"
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						<form.Field name="recipient">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldContent>
											<FieldLabel htmlFor={field.name}>Recipient</FieldLabel>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</FieldContent>

										<Select
											name={field.name}
											value={field.state.value}
											onValueChange={(value) =>
												field.handleChange(value ?? "candidate")
											}
										>
											<SelectTrigger aria-invalid={isInvalid} id={field.name}>
												<SelectValue placeholder="Recipient" />
											</SelectTrigger>
											<SelectContent>
												<SelectItem key={"candidate"} value={"candidate"}>
													Candidate
												</SelectItem>
												<SelectItem key={"admin"} value={"admin"}>
													Admin
												</SelectItem>
												<SelectItem key={"specific"} value={"specific"}>
													Specific
												</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								);
							}}
						</form.Field>

						{recipientValue === "specific" && (
							<form.Field name="recipientEmail">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>
												Recipient email
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
												placeholder="email@example.com"
												autoComplete="off"
												type="email"
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>
						)}

						<form.Field name="body">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>Email body</FieldLabel>
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

						<form.Field name="relatedTrigger">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>
											Configure Related Trigger
										</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) =>
												field.handleChange(
													e.target.value ? "admin" : "aspirant",
												)
											}
											aria-invalid={isInvalid}
											placeholder="Subject"
											autoComplete="off"
										/>
										<FieldDescription>
											Not necesary, leave it blank to not add a related trigger.
										</FieldDescription>
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
					<Button type="submit" form="email-node-edit-form">
						Save changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
