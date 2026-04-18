# Cumpleanos Felipe Tobar (30)

Muro de mensajes sin login usando Next.js + Neon + Cloudinary + Giphy.

## Stack

- Next.js 16 + React + TypeScript + Tailwind
- Neon Postgres + Prisma
- Cloudinary para fotos
- Giphy para buscador de GIFs (20 resultados)

## Variables de entorno

Usa `.env.local`:

```env
DATABASE_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_GIPHY_API_KEY=
```

## Preparar base de datos

```bash
npx prisma generate
npx prisma db push
```

## Correr local

```bash
npm install
npm run dev
```

## Subir a GitHub

```bash
git init
git add .
git commit -m "Birthday wall Felipe Tobar"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

## Desplegar en Vercel

1. Importa tu repo desde GitHub en Vercel.
2. En `Project Settings -> Environment Variables`, agrega las 5 variables.
3. Deploy.

## Endpoints internos

- `POST /api/upload` sube imagen a Cloudinary.
- `GET /api/posts` lista posts (ultimo primero).
- `POST /api/posts` crea post.

## Importante

- No subas `.env.local` al repo.
- Si compartiste secretos en chats/publico, rota credenciales luego del deploy.
