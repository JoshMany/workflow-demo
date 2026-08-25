import type { Dispatch, SetStateAction } from "react";
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
import { Label } from "@/components/ui/label";
import * as z from "zod";
import { useForm } from "@tanstack/react-form";
import { toast } from "@/components/ui/toast";
import { useWorkflowStore } from "@/providers/workflow-store-provider";
import { DialogRootActions, DialogRootProps } from "@base-ui/react";

const formSchema = z.object({
	name: z.string().max(32, "Workflow name should be at most 32 characters."),
});

export default function RenameWorkflowForm({
	uuid,
	isOpen,
	setIsOpen,
}: {
	uuid: string;
	isOpen: boolean;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
	const { renameWorkflow, Workflows } = useWorkflowStore((state) => state);
	const actionWorkflow = Workflows?.[uuid];
	const originalWorkflowName = actionWorkflow?.name;

	const form = useForm({
		defaultValues: {
			name: "",
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			setIsOpen(false);

			toast.promise(
				Promise.resolve().then(() => {
					renameWorkflow(uuid, value.name);
				}),
				{
					loading: "Renaming...",
					success: "Workflow renamed.",
					error: (err) => ({
						title: "Error!",
						description:
							err instanceof Error ? err.message : "Could not rename workflow.",
					}),
				},
			);
			form.reset();
		},
	});

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="sm:max-w-106.25">
				<DialogHeader>
					<DialogTitle>Rename</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.Field name="name">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor={field.name}>
											New workflow name
										</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder={originalWorkflowName}
											autoComplete="off"
										/>
										<FieldDescription>
											This change will replace the current name as "
											{originalWorkflowName}" for the new input.
										</FieldDescription>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>
					</FieldGroup>

					<DialogFooter>
						<DialogClose render={<Button variant="outline">Cancel</Button>} />
						<Button type="submit" disabled={uuid === "0"}>
							Save changes
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
