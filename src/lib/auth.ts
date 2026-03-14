import { supabase, supabaseAnonKey, supabaseUrl, switchToMemoryAuth, updatePersistence } from "./supabaseClient";

export type AuthUser = {
  id: string;
  email: string | null;
};

export type SignUpParams = {
  email: string;
  password: string;
  name: string;
  role: UserRole;
};

export type SignInParams = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export async function signUp({ email, password, name, role }: SignUpParams) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role
      }
    }
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    await ensureProfile({
      id: data.user.id,
      email: data.user.email ?? email,
      name,
      role
    });
  }

  return data;
}

import type { UserProfile, UserRole } from "./types";

// ... (other code)

export async function signIn({ email, password, rememberMe = true }: SignInParams) {
  // Update persistence before signing in
  updatePersistence(rememberMe ? "local" : "session");

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function resetPasswordForEmail(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw error;
  }

  return data;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Tiempo de espera agotado (${label})`)), ms)
    )
  ]);
}

async function setSessionWithFallback(access_token: string, refresh_token: string) {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.setSession({ access_token, refresh_token }),
      6000,
      "set-session"
    );
    if (error) throw error;
    return data;
  } catch {
    const memClient = switchToMemoryAuth();
    const { data, error } = await withTimeout(
      memClient.auth.setSession({ access_token, refresh_token }),
      6000,
      "set-session-mem"
    );
    if (error) throw error;
    return data;
  }
}

export async function signInDirect({ email, password }: SignInParams) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Faltan variables de entorno de Supabase");
  }

  const res = await withTimeout(
    fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    }),
    15000,
    "fetch-token"
  );

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error_description || json?.message || JSON.stringify(json);
    throw new Error(`Login fallido: ${msg}`);
  }

  const { access_token, refresh_token } = json;
  if (!access_token || !refresh_token) {
    throw new Error("Respuesta inválida de autenticación");
  }

  return setSessionWithFallback(access_token, refresh_token);
}

function clearLocalAuthStorage() {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("sb-"))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }
  try {
    Object.keys(window.sessionStorage)
      .filter((key) => key.startsWith("sb-"))
      .forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // ignore
  }
}

export async function signOut() {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // ignore
  } finally {
    clearLocalAuthStorage();
    switchToMemoryAuth();
  }
}

export async function getSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(
  cb: Parameters<typeof supabase.auth.onAuthStateChange>[0]
) {
  return supabase.auth.onAuthStateChange(cb);
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("id,name,email,role,created_at")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data as UserProfile;
}

export async function ensureProfile(params: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}) {
  const { error } = await supabase
    .from("users")
    .upsert(
      {
        id: params.id,
        email: params.email,
        name: params.name,
        role: params.role
      },
      { onConflict: "id" }
    );

  if (error) {
    throw error;
  }
}
