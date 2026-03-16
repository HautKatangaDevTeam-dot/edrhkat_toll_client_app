"use client";

import { useEffect, useMemo } from "react";
import { Provider } from "react-redux";

import { hydrateAuthState } from "@/state/features/auth/authSlice";
import { makeStore } from "@/state/store";

type Props = {
  children: React.ReactNode;
};

export function ReduxProvider({ children }: Props) {
  const store = useMemo(() => makeStore(), []);

  useEffect(() => {
    store.dispatch(hydrateAuthState());
  }, [store]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const root = document.documentElement;

    const applyTheme = (matches: boolean) => {
      root.classList.toggle("dark", matches);
    };

    applyTheme(media.matches);

    const onChange = (event: MediaQueryListEvent) => {
      applyTheme(event.matches);
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return <Provider store={store}>{children}</Provider>;
}
