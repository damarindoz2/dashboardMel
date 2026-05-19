# LEXMEL — Dashboard cliente

Dashboard de progreso del proyecto para compartir con el cliente. Muestra Gantt interactivo + detalle de cada milestone.

## Stack
- Vite (build estático)
- Supabase (base de datos, lectura pública)
- Vercel (hosting)

## Setup

### 1. Supabase
1. Crea un proyecto en https://supabase.com
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase_setup.sql`
3. Anota tu **Project URL** y **anon key** (Settings → API)

### 2. Local
```bash
npm install
cp .env.example .env
# Llena .env con tus datos de Supabase
npm run dev
```

### 3. Vercel
1. Sube este repo a GitHub (repo personal, no el del proyecto)
2. Importa en https://vercel.com
3. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` → tu Project URL
   - `VITE_SUPABASE_ANON_KEY` → tu anon key
4. Deploy — Vercel detecta Vite automáticamente

## Actualizar el progreso
Para cambiar el estado de un milestone, ve a Supabase → Table Editor → milestones y edita directamente. Los cambios se reflejan al instante para el cliente.

O con SQL:
```sql
update milestones set estado = 'Completado' where codigo = 'M4';
```

## Estados válidos
- `Sin iniciar`
- `En progreso`
- `Completado`
- `Entregado`
