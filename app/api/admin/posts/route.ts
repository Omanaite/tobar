import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const adminSchema = z.object({
  secret: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = adminSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud invalida" }, { status: 400 });
    }

    const expectedSecret = process.env.ADMIN_SECRET;
    if (!expectedSecret) {
      return NextResponse.json({ error: "ADMIN_SECRET no configurado" }, { status: 500 });
    }

    if (parsed.data.secret !== expectedSecret) {
      return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
    }

    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(posts);
  } catch (error) {
    console.error("POST /api/admin/posts error", error);
    return NextResponse.json({ error: "No se pudo cargar el panel privado" }, { status: 500 });
  }
}
