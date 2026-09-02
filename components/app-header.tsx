"use client";

import { Separator } from "@base-ui/react";
import { usePathname } from "next/navigation";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
} from "./ui/breadcrumb";
import { SidebarTrigger } from "./ui/sidebar";
import { ModeToggle } from "./ui/theme-switch";

export default function AppHeader() {
	const currentPath = usePathname();

	const breadcrumbMapping: Record<string, { title: string; url: string }> = {
		"/": { title: "Workflows", url: "/" },
		"/questionnaires": { title: "Questionnaires", url: "/questionnaires" },
	};

	const currentBreadcrumb =
		breadcrumbMapping[currentPath] || breadcrumbMapping["/"];

	return (
		<header className="flex h-fit py-2 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
			<div className="flex items-center align-middle gap-2 px-4">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="mr-2 data-[orientation=vertical]:h-auto"
				/>
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href={currentBreadcrumb.url}>
								{currentBreadcrumb.title}
							</BreadcrumbLink>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>
			<div className="px-4">
				<ModeToggle />
			</div>
		</header>
	);
}
