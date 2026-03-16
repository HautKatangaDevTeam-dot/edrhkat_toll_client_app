"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { notify } from "@/lib/notify";
import { refreshSession } from "@/state/features/auth/authSlice";
import { useAppDispatch, useAppSelector } from "@/state/hooks";

type Props = {
  children: React.ReactNode;
};

export default function ProtectedLayout({ children }: Props) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { accessToken, refreshToken, status } = useAppSelector(
    (state) => state.auth
  );
  const [mounted, setMounted] = useState(false);
  const attemptedRefresh = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (accessToken) return;
    if (refreshToken) {
      if (attemptedRefresh.current) return;
      attemptedRefresh.current = true;
      dispatch(refreshSession())
        .unwrap()
        .catch(() => {
          notify.error("Session expiree. Veuillez vous reconnecter.");
          router.replace("/auth");
        });
    } else {
      router.replace("/auth");
    }
  }, [accessToken, refreshToken, mounted, router, dispatch]);

  if (!mounted) {
    return null;
  }

  if (!accessToken) {
    if (refreshToken || status === "loading") {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Verification de la session...
        </div>
      );
    }
    return null;
  }

  return <>{children}</>;
}
