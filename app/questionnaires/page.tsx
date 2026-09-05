"use client";

import { HammerIcon, PlayIcon } from "lucide-react";
import { useState } from "react";
import QuestionnaireBuilder from "@/components/questionnaires/questionnaire-builder";
import QuestionnaireSelector from "@/components/questionnaires/questionnaire-selector";
import QuestionnaireSimulator from "@/components/questionnaires/questionnaire-simulator";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useDemoStore } from "@/providers/workflow-store-provider";

type StudioMode = "builder" | "simulator";

export default function QuestionnairesPage() {
	const [mode, setMode] = useState<StudioMode>("builder");
	const CurrentQuestionnaireUUID = useDemoStore(
		(state) => state.CurrentQuestionnaireUUID,
	);

	return (
		<div className="flex flex-1 flex-row overflow-hidden">
			{/* Templates system */}
			<QuestionnaireSelector />

			<Separator orientation="vertical" />

			{/* Studio: builder / simulator */}
			<div className="flex min-w-0 flex-1 flex-col m-2">
				<div className="mb-3 flex items-center justify-between">
					<h2 className="text-sm font-semibold">Template studio</h2>
					<div
						role="tablist"
						aria-label="Questionnaire studio mode"
						className="flex items-center gap-1 rounded-lg border border-input/60 bg-card/40 p-1"
					>
						<Button
							role="tab"
							aria-selected={mode === "builder"}
							variant={mode === "builder" ? "default" : "ghost"}
							size="sm"
							onClick={() => setMode("builder")}
						>
							<HammerIcon data-icon="inline-start" /> Builder
						</Button>
						<Button
							role="tab"
							aria-selected={mode === "simulator"}
							variant={mode === "simulator" ? "default" : "ghost"}
							size="sm"
							onClick={() => setMode("simulator")}
						>
							<PlayIcon data-icon="inline-start" /> Simulate
						</Button>
					</div>
				</div>

				<div className="flex min-h-0 flex-1 flex-col overflow-hidden">
					{mode === "builder" ? (
						<QuestionnaireBuilder key={CurrentQuestionnaireUUID} />
					) : (
						<QuestionnaireSimulator
							key={CurrentQuestionnaireUUID}
							questionnaireUUID={CurrentQuestionnaireUUID}
						/>
					)}
				</div>
			</div>
		</div>
	);
}
