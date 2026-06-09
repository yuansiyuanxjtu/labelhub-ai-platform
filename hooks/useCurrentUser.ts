"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppRole } from "@/lib/auth/permissions";

export const CURRENT_USER_CHANGED_EVENT = "labelhub:current-user-changed";

export type ClientCurrentUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
};

export function useCurrentUser() {
  const [user, setUser] = useState<ClientCurrentUser | null>(null);
  const [role, setRole] = useState<AppRole>("ADMIN");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await response.json()) as { user?: ClientCurrentUser };

      if (data.user?.role) {
        setUser(data.user);
        setRole(data.user.role);
      }
    } catch {
      // Keep the last known role if the mock auth endpoint is temporarily unavailable.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    function handleUserChanged(event: Event) {
      const nextRole = (event as CustomEvent<{ role?: AppRole }>).detail?.role;
      if (nextRole) {
        setRole(nextRole);
        setUser((current) => (current ? { ...current, role: nextRole } : current));
      }

      void refresh();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }

    window.addEventListener(CURRENT_USER_CHANGED_EVENT, handleUserChanged);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener(CURRENT_USER_CHANGED_EVENT, handleUserChanged);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refresh]);

  return {
    user,
    role,
    loading,
    refresh,
  };
}

export function notifyCurrentUserChanged(role?: AppRole) {
  window.dispatchEvent(
    new CustomEvent(CURRENT_USER_CHANGED_EVENT, {
      detail: {
        role,
      },
    }),
  );
}
