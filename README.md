# Gunnen · Check-in (MVP)

App web para gestión de clases, reservas y check-in con QR en el box.

## Funcionalidades
- Autenticación atleta / coach
- Horario diario de clases
- Reservas con control de cupo
- Check-in con QR
- Panel del coach + asistencia
- Diseño mobile-first

## Estructura del proyecto

```
.
├── README.md
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── public/
│   ├── assets/
│   └── fonts/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── routes/
│   └── styles/
└── supabase/
    ├── functions/
    ├── policies.sql
    ├── schema.sql
    └── seed.sql
```

## Setup

### 1) Supabase
- Crea un proyecto en Supabase.
- Ejecuta en el SQL Editor, en este orden:
  1. `supabase/schema.sql`
  2. `supabase/policies.sql`
  3. `supabase/seed.sql` (opcional)

### 2) Variables de entorno
Crea `.env` en la raíz:

```
VITE_SUPABASE_URL=tu_url
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### 3) Instalar y ejecutar

```
npm install
npm run dev
```

## Notas
- Las reglas de cupo y duplicados se validan en la base de datos.
- Al hacer check-in, la reserva se actualiza a `present`.

