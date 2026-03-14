import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan variables de entorno. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY."
  );
}

const memoryStorage = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();

const safeStorage = {
  getItem: (key: string) => {
    try {
      return (window.localStorage.getItem(key) || window.sessionStorage.getItem(key));
    } catch {
      return memoryStorage.getItem(key);
    }
  },
  setItem: (key: string, value: string) => {
    // This is a default wrapper, specific storage is handled in initSupabaseClient
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memoryStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      memoryStorage.removeItem(key);
    }
  }
};

const sessionOnlyStorage = {
  getItem: (key: string) => {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return memoryStorage.getItem(key);
    }
  },
  setItem: (key: string, value: string) => {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      memoryStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      memoryStorage.removeItem(key);
    }
  }
};

let supabaseClient: SupabaseClient;

export type PersistenceType = "local" | "session" | "memory";

export function initSupabaseClient(persistence: PersistenceType = "local") {
  const storage = persistence === "local" ? safeStorage : 
                  persistence === "session" ? sessionOnlyStorage : 
                  memoryStorage;

  supabaseClient = createClient(supabaseUrl as string, supabaseAnonKey as string, {
    auth: {
      persistSession: persistence !== "memory",
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage
    }
  });
  return supabaseClient;
}

export function getSupabaseClient() {
  return supabaseClient;
}

export let supabase = initSupabaseClient("local");

export function updatePersistence(persistence: PersistenceType) {
  supabase = initSupabaseClient(persistence);
  return supabase;
}

export function switchToMemoryAuth() {
  return updatePersistence("memory");
}
