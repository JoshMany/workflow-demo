"use client";

import { Workflow } from "lucide-react";
import { usePathname } from "next/navigation";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const currentPath = usePathname();

	const data = {
		navMain: [
			{
				title: "Workflows",
				url: "/",
				isActive: currentPath === "/",
				icon: Workflow,
			},
			{
				title: "Questionnaires",
				url: "/questionnaires",
				isActive: currentPath === "/questionnaires",
				icon: Workflow,
			},
		],
	};

	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<SidebarMenuButton
					size="lg"
					className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
				>
					<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
						<Workflow className="size-4" />
					</div>
					<span className="text-lg font-semibold">Workflow Demo</span>
				</SidebarMenuButton>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent className="flex flex-col gap-2">
						<SidebarMenu>
							{data.navMain.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton tooltip={item.title}>
										{item.icon && <item.icon />}
										<span>{item.title}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}
