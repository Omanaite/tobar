"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import EmojiPicker, { EmojiStyle, Theme } from "emoji-picker-react";
import { Toaster, toast } from "react-hot-toast";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, isFirebaseConfigured, storage } from "@/lib/firebase";

type Post = {
  id: string;
  name: string;
  message: string;
  isPrivate: boolean;
  photoUrls: string[];
  gifUrls: string[];
  createdAt?: { seconds?: number };
};

type GiphyResult = {
  id: string;
  title: string;
  images: {
    fixed_height_small: { url: string };
    original: { url: string };
  };
};

const MAX_IMAGES = 10;
const PREVIEW_LENGTH = 180;

function formatDate(value?: { seconds?: number }) {
  if (!value?.seconds) return "Ahora";
  return new Date(value.seconds * 1000).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortText(text: string) {
  if (text.length <= PREVIEW_LENGTH) return text;
  return `${text.slice(0, PREVIEW_LENGTH).trim()}...`;
}

function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, index) => {
    if (/^https?:\/\/[^\\s]+$/.test(part)) {
      return (
        <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer" className="text-blue-700 underline break-all">
          {part}
        </a>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifQuery, setGifQuery] = useState("");
  const [gifResults, setGifResults] = useState<GiphyResult[]>([]);
  const [selectedGifs, setSelectedGifs] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [spellLang, setSpellLang] = useState<"es" | "en">("es");
  const [carouselPhotos, setCarouselPhotos] = useState<string[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselAnimating, setCarouselAnimating] = useState(false);

  const canPublish = useMemo(() => message.trim().length > 0 && !publishing && isFirebaseConfigured, [message, publishing]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Post, "id">) }));
      setPosts(data);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!gifOpen) return;
    const trimmed = gifQuery.trim();
    if (trimmed.length < 2) {
      setGifResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.giphy.com/v1/gifs/search?api_key=${process.env.NEXT_PUBLIC_GIPHY_API_KEY}&q=${encodeURIComponent(trimmed)}&limit=20&rating=g&lang=es`
        );
        const data = (await response.json()) as { data?: GiphyResult[] };
        setGifResults(data.data ?? []);
      } catch {
        toast.error("No se pudieron cargar GIFs");
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [gifQuery, gifOpen]);

  useEffect(() => {
    const publicPhotos = posts
      .filter((post) => !post.isPrivate)
      .flatMap((post) => post.photoUrls ?? [])
      .filter(Boolean);

    if (publicPhotos.length === 0) {
      setCarouselPhotos([]);
      setCarouselIndex(0);
      return;
    }

    const shuffled = [...publicPhotos];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    setCarouselPhotos(shuffled.slice(0, 20));
    setCarouselIndex(0);
  }, [posts]);

  useEffect(() => {
    if (carouselPhotos.length <= 1) return;
    const timer = setInterval(() => {
      setCarouselAnimating(true);
      setCarouselIndex((prev) => (prev + 1) % carouselPhotos.length);
      setTimeout(() => setCarouselAnimating(false), 450);
    }, 3500);

    return () => clearInterval(timer);
  }, [carouselPhotos]);

  const resetForm = () => {
    setName("");
    setMessage("");
    setIsPrivate(false);
    setFiles([]);
    setSelectedGifs([]);
    setGifQuery("");
    setGifResults([]);
    setEmojiOpen(false);
    setGifOpen(false);
  };

  const handlePublish = async () => {
    if (!canPublish || !db || !storage) return;

    const confirmed = window.confirm("¿Seguro que quieres publicar este mensaje? Después no se podrá editar.");
    if (!confirmed) return;

    setPublishing(true);
    try {
      const photoUrls: string[] = [];
      for (const file of files.slice(0, MAX_IMAGES)) {
        const filePath = `birthday-posts/${Date.now()}-${crypto.randomUUID()}-${file.name}`;
        const fileRef = ref(storage, filePath);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        photoUrls.push(url);
      }

      await addDoc(collection(db, "posts"), {
        name: name.trim() || "Amigo/a anónimo",
        message: message.trim(),
        isPrivate,
        photoUrls,
        gifUrls: selectedGifs,
        createdAt: serverTimestamp(),
      });

      toast.success("Mensaje publicado");
      resetForm();
    } catch {
      toast.error("No se pudo publicar el mensaje");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-rose-50 to-orange-100 text-slate-800">
      <Toaster position="top-center" />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-amber-200 bg-white/80 p-4 shadow-xl backdrop-blur-sm sm:p-6">
          <h2 className="mb-3 text-xl font-extrabold text-rose-700 sm:text-2xl">Momentos de la banda</h2>
          {carouselPhotos.length > 0 ? (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl">
                <Image
                  src={carouselPhotos[carouselIndex]}
                  alt={`Foto ${carouselIndex + 1} del carrusel`}
                  width={1400}
                  height={700}
                  className={`h-56 w-full object-cover transition-all duration-500 sm:h-72 ${
                    carouselAnimating ? "scale-[1.03] opacity-90" : "scale-100 opacity-100"
                  }`}
                  unoptimized
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {carouselPhotos.slice(0, 10).map((photo, index) => (
                  <button
                    key={`${photo}-${index}`}
                    type="button"
                    onClick={() => setCarouselIndex(index)}
                    className={`h-2.5 w-8 rounded-full transition ${index === carouselIndex ? "bg-rose-600" : "bg-amber-200"}`}
                    aria-label={`Ir a foto ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Cuando suban fotos a posts publicos, apareceran aqui en orden aleatorio.</p>
          )}
        </section>

        <section className="rounded-3xl border border-amber-200 bg-white/80 p-6 shadow-xl backdrop-blur-sm">
          <h1 className="text-3xl font-black tracking-tight text-rose-700 sm:text-4xl">Felipe Tobar cumple 30</h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Deja tu mensaje de cumpleanos para Felipe. Abogado brillante, dormilon oficial de las fiestas.
          </p>

          {!isFirebaseConfigured && (
            <p className="mt-4 rounded-lg bg-rose-100 p-3 text-sm text-rose-700">
              Configura las variables `NEXT_PUBLIC_FIREBASE_*` y `NEXT_PUBLIC_GIPHY_API_KEY` para habilitar publicaciones.
            </p>
          )}

          <div className="mt-5 grid gap-3">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre (opcional)"
              className="rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none ring-rose-300 transition focus:ring"
            />

            <div className="rounded-xl border border-amber-200 bg-white p-2">
              <div className="mb-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setEmojiOpen((prev) => !prev)}
                  className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900"
                >
                  Emojis
                </button>
                <button
                  type="button"
                  onClick={() => setGifOpen((prev) => !prev)}
                  className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900"
                >
                  GIFs
                </button>
                <label className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                  Agregar fotos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      const incoming = Array.from(event.target.files ?? []);
                      const next = [...files, ...incoming].slice(0, MAX_IMAGES);
                      setFiles(next);
                    }}
                  />
                </label>
                <select
                  value={spellLang}
                  onChange={(event) => setSpellLang(event.target.value as "es" | "en")}
                  className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900"
                >
                  <option value="es">Corrector: Espanol</option>
                  <option value="en">Corrector: English</option>
                </select>
              </div>

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Escribe tu mensaje para Felipe..."
                spellCheck
                lang={spellLang}
                className="h-36 w-full resize-y rounded-lg border border-amber-100 p-3 text-sm outline-none ring-rose-300 transition focus:ring"
              />

              {emojiOpen && (
                <div className="mt-3">
                  <EmojiPicker
                    emojiStyle={EmojiStyle.GOOGLE}
                    theme={Theme.LIGHT}
                    onEmojiClick={(emojiData) => setMessage((prev) => `${prev}${emojiData.emoji}`)}
                    searchPlaceholder="Buscar emoji"
                    width="100%"
                    height={350}
                    lazyLoadEmojis
                  />
                </div>
              )}

              {gifOpen && (
                <div className="mt-3 rounded-lg border border-amber-200 p-3">
                  <input
                    value={gifQuery}
                    onChange={(event) => setGifQuery(event.target.value)}
                    placeholder="Busca GIFs (minimo 2 letras)"
                    className="w-full rounded-lg border border-amber-100 px-3 py-2 text-sm outline-none"
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {gifResults.map((gif) => (
                      <button
                        key={gif.id}
                        type="button"
                        onClick={() => {
                          if (selectedGifs.includes(gif.images.original.url)) return;
                          setSelectedGifs((prev) => [...prev, gif.images.original.url]);
                          toast.success("GIF agregado");
                        }}
                        className="overflow-hidden rounded-lg border border-amber-200"
                      >
                        <Image
                          src={gif.images.fixed_height_small.url}
                          alt={gif.title || "GIF"}
                          width={200}
                          height={120}
                          className="h-24 w-full object-cover"
                          unoptimized
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedGifs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedGifs.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setSelectedGifs((prev) => prev.filter((item) => item !== url))}
                      className="rounded-full bg-rose-100 px-3 py-1 text-xs text-rose-700"
                    >
                      Quitar GIF
                    </button>
                  ))}
                </div>
              )}

              {files.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px]">
                      <p className="truncate">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={isPrivate} onChange={(event) => setIsPrivate(event.target.checked)} />
                  Mensaje privado (en el muro solo aparecera bloqueado)
                </label>
                <button
                  type="button"
                  disabled={!canPublish}
                  onClick={handlePublish}
                  className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {publishing ? "Publicando..." : "Dejar mensaje a Felipe"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-amber-200 bg-white/90 p-4 shadow-md">
              <p className="text-xs uppercase tracking-wide text-slate-500">{formatDate(post.createdAt)}</p>
              <h2 className="mt-1 text-base font-bold text-rose-700">{post.name || "Amigo/a"}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{post.isPrivate ? "Mensaje privado para Felipe" : shortText(post.message)}</p>
              <button
                type="button"
                onClick={() => setSelectedPost(post)}
                className="mt-3 rounded-full bg-amber-100 px-4 py-1 text-xs font-semibold text-amber-900"
              >
                Ver post completo
              </button>
            </article>
          ))}

          {posts.length === 0 && <p className="text-center text-sm text-slate-500">Todavia no hay mensajes. Se el primero.</p>}
        </section>
      </main>

      {selectedPost && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedPost(null)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-rose-700">{selectedPost.name}</h3>
                <p className="text-xs text-slate-500">{formatDate(selectedPost.createdAt)}</p>
              </div>
              <button type="button" onClick={() => setSelectedPost(null)} className="text-2xl leading-none text-slate-500">
                x
              </button>
            </div>

            <div className="mt-4 whitespace-pre-wrap text-sm text-slate-800">{selectedPost.isPrivate ? "Mensaje privado para Felipe" : renderTextWithLinks(selectedPost.message)}</div>

            {selectedPost.gifUrls?.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {selectedPost.gifUrls.map((gifUrl) => (
                  <Image key={gifUrl} src={gifUrl} alt="GIF" width={240} height={140} className="h-28 w-full rounded-lg object-cover" unoptimized />
                ))}
              </div>
            )}

            {selectedPost.photoUrls?.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {selectedPost.photoUrls.map((photoUrl) => (
                  <button key={photoUrl} type="button" onClick={() => setSelectedImage(photoUrl)} className="overflow-hidden rounded-lg border border-amber-100">
                    <Image src={photoUrl} alt="Foto del post" width={200} height={150} className="h-24 w-full object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedImage(null)}>
          <div className="relative max-h-[92vh] max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setSelectedImage(null)} className="absolute -right-2 -top-2 rounded-full bg-white px-2 py-0.5 text-black">
              x
            </button>
            <Image src={selectedImage} alt="Vista completa" width={1200} height={900} className="max-h-[90vh] w-auto rounded-xl object-contain" unoptimized />
          </div>
        </div>
      )}
    </div>
  );
}

