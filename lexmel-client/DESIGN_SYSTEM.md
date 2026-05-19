# LexMel Design System (dashboard)

Este proyecto Vite usa los mismos tokens que la app principal (`globals.css`).

## Setup

| Archivo | Rol |
|---------|-----|
| `src/globals.css` | Tailwind v4 + tokens `:root` + componentes |
| `index.html` | Montserrat (Google Fonts) |
| `src/main.js` | `import './globals.css'` |

## Fuentes

- **Cuerpo:** Montserrat → `font-sans`
- **Títulos:** Lufga (pendiente) → fallback Montserrat → `font-heading`
- **Mono:** Geist Mono (`@fontsource/geist-mono`) → `font-mono`

## Tokens principales

Ver `:root` en `src/globals.css`: `--lexmel-accent`, `--sidebar`, `--success`, `--warning`, `--radius`, etc.

## Componentes CSS (vanilla)

Clases alineadas con shadcn de la app:

- `badge`, `badge-success`, `badge-warning`, `badge-destructive`, `badge-secondary`, `badge-neutral`
- `card`, `card-padded`
- `page-header-title`, `page-header-desc`, `section-label`
- Layout: `app-header` (sidebar brand), `app-main` (`bg-background`)

No uses colores hex sueltos en JS; usa clases semánticas (`gantt-bar--done`, `rf-seg-completado`, etc.).
