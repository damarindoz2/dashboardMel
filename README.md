# dashboardMel

Dashboard de progreso LEXMEL para el cliente.

## Deploy en Vercel

1. Importa este repo en [Vercel](https://vercel.com).
2. **Root Directory:** deja vacío (raíz del repo). El `vercel.json` ya apunta a `lexmel-client/`.
   - Alternativa: pon **Root Directory** = `lexmel-client` y borra los `cd lexmel-client` del `vercel.json` (deja solo `pnpm install` / `pnpm run build` y `outputDirectory`: `dist`).
3. **Environment Variables** (Production y Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy.

## Desarrollo local

```bash
cd lexmel-client
pnpm install
cp .env.example .env   # llena con tus credenciales de Supabase
pnpm dev
```
