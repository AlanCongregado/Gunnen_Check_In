import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { UserProfile } from "../../lib/types";
import { ensureProfile, getProfile, onAuthStateChange } from "../../lib/auth";
import { supabase } from "../../lib/supabaseClient";

type AuthState = {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function fetchProfile(userId: string) {
  try {
    return await getProfile(userId);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let timeoutId: number | undefined;

    // Evita que el loading quede colgado si algo bloquea la llamada.
    timeoutId = window.setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 3000);

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      if (data.session?.user?.id) {
        let nextProfile = await fetchProfile(data.session.user.id);
        if (!nextProfile) {
          const user = data.session.user;
          const name =
            (user.user_metadata?.name as string | undefined) ??
            (user.email ? user.email.split("@")[0] : "Atleta");
          const role = (user.user_metadata?.role as "athlete" | "coach" | undefined) ?? "athlete";
          try {
            await ensureProfile({
              id: user.id,
              email: user.email ?? "",
              name,
              role
            });
            nextProfile = await fetchProfile(user.id);
          } catch {
            nextProfile = null;
          }
        }
        if (mounted) setProfile(nextProfile);
      }
      setLoading(false);
      if (timeoutId) window.clearTimeout(timeoutId);
    }).catch(() => {
      if (!mounted) return;
      setLoading(false);
      if (timeoutId) window.clearTimeout(timeoutId);
    });

    const { data: subscription } = onAuthStateChange(async (_event, next) => {
      setSession(next);
      if (next?.user?.id) {
        let nextProfile = await fetchProfile(next.user.id);
        if (!nextProfile) {
          const user = next.user;
          const name =
            (user.user_metadata?.name as string | undefined) ??
            (user.email ? user.email.split("@")[0] : "Atleta");
          const role = (user.user_metadata?.role as "athlete" | "coach" | undefined) ?? "athlete";
          try {
            await ensureProfile({
              id: user.id,
              email: user.email ?? "",
              name,
              role
            });
            nextProfile = await fetchProfile(user.id);
          } catch {
            nextProfile = null;
          }
        }
        setProfile(nextProfile);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      if (timeoutId) window.clearTimeout(timeoutId);
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      profile,
      loading,
      refreshProfile: async () => {
        if (!session?.user?.id) return;
        const nextProfile = await fetchProfile(session.user.id);
        setProfile(nextProfile);
      }
    }),
    [session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
