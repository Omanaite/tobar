import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const postSchema = z.object({
  name: z.string().trim().max(120).optional(),
  message: z.string().trim().min(1).max(8000),
  isPrivate: z.boolean(),
  photoUrls: z.array(z.string().url()).max(10).default([]),
  gifUrls: z.array(z.string().url()).max(20).default([]),
});

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("GET /api/posts error", error);
    return NextResponse.json({ error: "No se pudo cargar el muro" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = postSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
    }

    const { name, message, isPrivate, photoUrls, gifUrls } = parsed.data;

    const post = await prisma.post.create({
      data: {
        name: name && name.length > 0 ? name : "Amigo/a anonimo",
        message,
        isPrivate,
        photoUrls,
        gifUrls,
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error("POST /api/posts error", error);
    return NextResponse.json({ error: "No se pudo crear el post" }, { status: 500 });
  }
}
