import { useState, useEffect, createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/store/useAppStore";

// Mapeamento role do banco → role do app (RBAC)
const ROLE_MAP: Record<string, UserRole> = {
  admin:        "ADMIN",
  gestor:       "ADMIN",
  laboratorio:  "LABORATORIO",
  producao:     "PRODUCAO",
  visualizador: "VENDAS",
  
  // Novas chaves geradas pelo painel (Cadastrados pela EdgeFunction)
  ADMIN:        "ADMIN",
  LABORATORIO:  "LABORATORIO",
  PRODUCAO:     "PRODUCAO",
  VENDAS:       "VENDAS",
};

export interface AuthProfile {
  id: string;
  nome: string;
  role: UserRole;
  organization_id: string | null;
  ativo: boolean;
}

interface AuthContextType {
  session: Session | null;
  profile: AuthProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

import { createElement } from "react";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, nome, role, organization_id, ativo")
      .eq("id", userId)
      .single();

    if (error || !data) {
      setProfile(null);
      return;
    }

    setProfile({
      id: data.id,
      nome: data.nome,
      role: ROLE_MAP[data.role] ?? "LABORATORIO",
      organization_id: data.organization_id,
      ativo: data.ativo,
    });
  }

  useEffect(() => {
    // Verificar sessão existente ao iniciar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Ouvir mudanças de sessão em tempo real
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }

  return createElement(
    AuthContext.Provider,
    { value: { session, profile, loading, signIn, signOut } },
    children
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
