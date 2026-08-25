import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { ModeToggle } from "@/components/ui/theme-switch";
import WorkflowSelector from "@/components/workflow/selector";
import WorkflowChart from "@/components/workflow/workflow-chart";

export default function Home() {
	return (
		<div className="flex flex-col flex-1 dark:bg-black min-h-screen">
			<main className="flex flex-1 flex-col">
				<header className="flex h-fit py-3 shrink-0 items-center justify-between border-b px-3">
					<div className="flex items-center h-fit my-0 py-0">
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbPage>Workflow Demo</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
					<ModeToggle />
				</header>
				<div className="flex flex-1 flex-row gap-2 p-3">
					<WorkflowSelector />
					<WorkflowChart />
				</div>
			</main>
		</div>
	);
}
