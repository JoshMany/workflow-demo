"use client";

import { Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
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
				title: "Main",
				url: "/",
				items: [
					{
						title: "Workflows",
						url: "/",
						isActive: currentPath === "/",
					},
					{
						title: "Questionnaires",
						url: "/questionnaires",
						isActive: currentPath === "/questionnaires",
					},
				],
			},
		],
	};

	return (
		<Sidebar {...props}>
			<SidebarHeader>
				<Link
					className="flex items-center gap-2 text-lg font-semibold px-2 py-1"
					href="/"
				>
					<Workflow /> Workflow Demo
				</Link>
			</SidebarHeader>
			<SidebarContent>
				{data.navMain.map((item) => (
					<SidebarGroup key={item.title}>
						<SidebarGroupLabel>{item.title}</SidebarGroupLabel>
						<SidebarGroupContent>
							<SidebarMenu>
								{item.items.map((item) => (
									<SidebarMenuItem key={item.title}>
										<SidebarMenuButton
											isActive={item.isActive}
											render={<Link href={item.url} />}
										>
											{item.title}
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				))}
			</SidebarContent>
			<SidebarRail />
		</Sidebar>
	);
}
