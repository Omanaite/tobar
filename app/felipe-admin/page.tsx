"use client";

import { useState } from "react";
import Image from "next/image";

type Post = {
  id: string;
  name: string;
  message: string;
  isPrivate: boolean;
  photoUrls: string[];
  gifUrls: string[];
  createdAt: string;
};

function formatDate(value?: string) {
  if (!value) return "Ahora";
  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FelipeAdminPage() {
  const [secret, setSecret] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loadPrivateFeed = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });

      const data = (await response.json()) as Post[] | { error?: string };
      if (!response.ok) {
        setError((data as { error?: string }).error ?? "No autorizado");
        setPosts([]);
        return;
      }

      setPosts(data as Post[]);
    } catch {
      setError("No se pudo conectar con el servidor");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h1 className="text-2xl font-black">Panel privado de Felipe</h1>
          <p className="mt-1 text-sm text-slate-400">Aqui puedes ver todos los mensajes, incluyendo los privados.</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <input
              type="password"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Ingresa la clave privada"
              className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={loadPrivateFeed}
              disabled={!secret || loading}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
            >
              {loading ? "Cargando..." : "Ver mensajes privados"}
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
        </section>

        <section className="grid gap-4">
          {posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">{formatDate(post.createdAt)}</p>
              <h2 className="mt-1 text-base font-bold text-amber-300">{post.name || "Amigo/a"}</h2>
              <p className="mt-1 text-xs text-slate-400">{post.isPrivate ? "Privado" : "Publico"}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{post.message}</p>

              {post.gifUrls?.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {post.gifUrls.map((gif) => (
                    <Image key={gif} src={gif} alt="GIF" width={240} height={140} className="h-24 w-full rounded-lg object-cover" unoptimized />
                  ))}
                </div>
              )}

              {post.photoUrls?.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {post.photoUrls.map((photo) => (
                    <Image key={photo} src={photo} alt="Foto" width={240} height={160} className="h-24 w-full rounded-lg object-cover" unoptimized />
                  ))}
                </div>
              )}
            </article>
          ))}

          {posts.length === 0 && !error && <p className="text-sm text-slate-400">Ingresa la clave para cargar los mensajes.</p>}
        </section>
      </div>
    </main>
  );
}
