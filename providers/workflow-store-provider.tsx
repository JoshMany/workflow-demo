"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { useStore } from "zustand";
import { createDemoStore, type DemoStore } from "@/store/demoStore";

const DemoStoreContext = createContext<typeof createDemoStore | null>(null);

type DemoStoreProviderProps = {
	children: ReactNode;
};

export const DemoStoreProvider = ({ children }: DemoStoreProviderProps) => {
	const [store] = useState(() => createDemoStore);
	return (
		<DemoStoreContext.Provider value={store}>
			{children}
		</DemoStoreContext.Provider>
	);
};

export const useDemoStore = <T,>(selector: (store: DemoStore) => T): T => {
	const demoStoreContext = useContext(DemoStoreContext);

	if (!demoStoreContext) {
		throw new Error(`useDemoStore must be used within DemoStoreProvider`);
	}

	return useStore(demoStoreContext, selector);
};
