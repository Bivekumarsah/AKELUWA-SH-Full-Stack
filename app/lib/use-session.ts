"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, User } from "@/app/lib/api";

function destinationFor(user: User) {
  return user.role === "admin" || user.role === "sub_admin" ? "/admin" : "/account";
}

export function useGuestOnly() {
  const [checkingSession, setCheckingSession] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const { user } = await apiFetch<{ user: User }>("/auth/me", { cache: "no-store" });
      window.location.replace(destinationFor(user));
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        setCheckingSession(false);
        return;
      }
      setCheckingSession(false);
    }
  }, []);

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void checkSession(), 0);
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setCheckingSession(true);
        void checkSession();
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.clearTimeout(initialCheck);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [checkSession]);

  return checkingSession;
}

export function useProtectedPage(options: { requireAdmin?: boolean } = {}) {
  useEffect(() => {
    const revalidate = async (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      try {
        const { user } = await apiFetch<{ user: User }>("/auth/me", { cache: "no-store" });
        if (options.requireAdmin && user.role !== "admin" && user.role !== "sub_admin") {
          window.location.replace("/account");
        }
      } catch {
        window.location.replace("/login");
      }
    };
    window.addEventListener("pageshow", revalidate);
    return () => window.removeEventListener("pageshow", revalidate);
  }, [options.requireAdmin]);
}
