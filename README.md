# Cumpleanos Felipe Tobar (30)

Pagina web para que amigos dejen mensajes, fotos y GIFs sin login.

## Stack

- Next.js 16 + React + TypeScript
- Tailwind CSS 4
- Firebase (Firestore + Storage, plan gratuito)
- Giphy API para buscador de GIFs (20 resultados por busqueda)
- Emoji picker estilo Google (muy similar a WhatsApp en Android)

## Funcionalidades

- Muro tipo blog, ordenado por fecha (ultimo post primero)
- Formulario simple con:
  - Nombre opcional
  - Mensaje
  - Privacidad (publico/privado)
  - Hasta 10 fotos opcionales
  - Selector de emojis
  - Buscador de GIFs con debounce y fetch dinamico
  - Corrector ortografico del navegador (ES/EN)
- Confirmacion antes de publicar (luego no se puede editar)
- Resumen de posts en home
- Modal para ver post completo
- Vista miniatura de imagenes y visor en tamano completo

## Configuracion local

1. Instala dependencias:

```bash
npm install
```

2. Crea `.env.local` desde `.env.example` y completa variables.

3. Ejecuta:

```bash
npm run dev
```

## Firebase (gratis y simple)

1. Crea un proyecto en Firebase Console.
2. Activa **Firestore Database** (modo produccion).
3. Activa **Storage**.
4. Crea una app Web y copia las credenciales en `.env.local`.
5. En Firestore crea una coleccion `posts` (se crea sola en el primer insert tambien).

Campos guardados por post:

- `name: string`
- `message: string`
- `isPrivate: boolean`
- `photoUrls: string[]`
- `gifUrls: string[]`
- `createdAt: timestamp`

## Reglas recomendadas (MVP sin login)

### Firestore Rules

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

### Storage Rules

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /birthday-posts/{allPaths=**} {
      allow read: if true;
      allow write: if request.resource.size < 8 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

## Deploy en Vercel

1. Sube repo a GitHub.
2. Importa el proyecto en Vercel.
3. Agrega las mismas variables de `.env.local` en **Project Settings -> Environment Variables**.
4. Deploy.

## Nota sobre emojis de WhatsApp

WhatsApp no publica oficialmente su set completo como libreria open-source reutilizable.
En esta version usamos `emoji-picker-react` con estilo Google, que visualmente es la opcion mas cercana para este caso.
