import { AppSidebar } from "@/components/app-sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/ui/theme-switch";
import WorkflowSelector from "@/components/workflow/selector";
import WorkflowChart from "../../components/workflow/workflow-chart";

export default function Page() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-fit py-3 shrink-0 items-center justify-between border-b px-3">
					<div className="flex items-center h-fit my-0 py-0">
						<SidebarTrigger className="-ml-1" />
						<Separator
							orientation="vertical"
							className="mr-2 data-vertical:h-4 data-vertical:self-auto"
						/>
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
			</SidebarInset>
		</SidebarProvider>
	);
}
