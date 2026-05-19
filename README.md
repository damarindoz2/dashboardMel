# dashboardMel

Dashboard de progreso LEXMEL para el cliente.

## Deploy en Vercel

1. Importa este repo en [Vercel](https://vercel.com).
2. **Root Directory:** debe ser `lexmel-client` (Settings → General). Los comandos de build corren desde esa carpeta.
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
