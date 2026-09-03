import { useForm } from "@tanstack/react-form";
import type { Dispatch, SetStateAction } from "react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
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
import { toast } from "@/components/ui/toast";
import { useDemoStore } from "@/providers/workflow-store-provider";

const formSchema = z.object({
	name: z
		.string()
		.min(1, "Template name is required.")
		.max(80, "Template name should be at most 80 characters."),
});

export default function RenameQuestionnaireForm({
	uuid,
	isOpen,
	setIsOpen,
}: {
	uuid: string;
	isOpen: boolean;
	setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
	const { renameQuestionnaire, Questionnaires } = useDemoStore(
		(state) => state,
	);
	const currentName = Questionnaires?.[uuid]?.name;

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
					renameQuestionnaire(uuid, value.name);
				}),
				{
					loading: "Renaming...",
					success: "Template renamed.",
					error: (err) => ({
						title: "Error!",
						description:
							err instanceof Error ? err.message : "Could not rename template.",
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
					<DialogTitle>Rename template</DialogTitle>
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
										<FieldLabel htmlFor={field.name}>Template name</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder={currentName}
											autoComplete="off"
										/>
										<FieldDescription>
											This change will replace the current name "{currentName}"
											for the new input.
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
						<Button type="submit">Save changes</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
