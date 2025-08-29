"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get("redirect") ?? "/admin";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    router.push(redirect);
  };

  return (
    <form onSubmit={onSubmit} className="bg-pink-500/10 p-4 rounded-xl space-y-3">
      {errorMsg && <p className="bg-pink-600 text-white rounded px-3 py-2">{errorMsg}</p>}

      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full border rounded px-3 py-2"
      />

      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        className="w-full border rounded px-3 py-2"
      />

      <button type="submit" disabled={loading} className="w-full bg-pink-600 text-white rounded py-2">
        {loading ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
