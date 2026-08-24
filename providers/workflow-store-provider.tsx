"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { useStore } from "zustand";
import { createWorkflowStore } from "@/components/workflow/store";
import type { WorkflowStore } from "@/components/workflow/types";

export type WorkflowStoreApi = ReturnType<typeof createWorkflowStore>;

export const WorkflowStoreContext = createContext<WorkflowStoreApi | undefined>(
	undefined,
);

export interface WorkflowStoreProviderProps {
	children: ReactNode;
}

export const WorkflowStoreProvider = ({
	children,
}: WorkflowStoreProviderProps) => {
	const [store] = useState(() => createWorkflowStore());
	return (
		<WorkflowStoreContext.Provider value={store}>
			{children}
		</WorkflowStoreContext.Provider>
	);
};

export const useWorkflowStore = <T,>(
	selector: (store: WorkflowStore) => T,
): T => {
	const workflowStoreContext = useContext(WorkflowStoreContext);

	if (!workflowStoreContext) {
		throw new Error(
			`useWorkflowStore must be used within WorkflowStoreProvider`,
		);
	}

	return useStore(workflowStoreContext, selector);
};
