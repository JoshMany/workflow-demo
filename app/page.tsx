import WorkflowSelector from "@/components/workflow/selector";
import WorkflowChart from "@/components/workflow/workflow-chart";

export default function Home() {
	return (
		<div className="flex flex-col flex-1 dark:bg-black">
			<main className="flex flex-1 flex-col">
				<div className="flex flex-1 flex-row gap-2 p-3">
					<WorkflowSelector />
					<WorkflowChart />
				</div>
			</main>
		</div>
	);
}
