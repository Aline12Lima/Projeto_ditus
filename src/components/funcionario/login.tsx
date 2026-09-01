"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Back } from "@/components/shared/back";
import { Mark } from "@/components/shared/logo";
import { Shell } from "@/components/shared/shell";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const { error } = await createBrowserSupabaseClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.replace(searchParams.get("next") || "/funcionario/painel");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally { setLoading(false); }
  }

  return <Shell><header className="simple-header"><Back href="/" /><Mark /></header><form className="login" onSubmit={submit}><div className="avatar">👤</div><h1>Painel Administrativo</h1><p>Entre para gerenciar seu restaurante.</p>{errorMessage && <p className="feedback-message error" role="alert">{errorMessage}</p>}<label>E-mail<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" type="email" required /></label><label>Senha<input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" type="password" required /></label><button className="solid-button" type="submit" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button></form></Shell>;
}
