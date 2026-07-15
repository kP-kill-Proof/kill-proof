# KILL PROOF — Sales Tool

App del equipo para organizar sales de GW2: dailies, orden óptimo de bosses, roster, eventos.

## Correr local (desarrollo)

```
npm install
npm run dev
```

## Publicar (una sola vez)

1. Crear repo en GitHub y subir **el contenido de esta carpeta** (package.json debe quedar en la raíz del repo).
2. En el repo: Settings → Pages → Source: **GitHub Actions**.
3. Cada push a `main` publica solo (workflow en `.github/workflows/deploy.yml`).
## Datos

- `public/data/wings.json` — wings, bosses, tiempos, LI
- `public/data/players.json` — roster
- `public/data/events.json` — ventas por evento
- `public/data/guidelines.md` — guía de uso

Se editan desde la app (Biblia/Eventos) y se publican con el botón "Guardar en GitHub" (token en Ajustes), o editando el archivo directo en GitHub web.
