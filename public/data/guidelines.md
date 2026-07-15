# Guidelines — KILL PROOF Sales Tool

## Cómo usar la app el día del sale

1. Abre la app. En **Sale del Día** verás los 4 Daily Raid Bounties de hoy (se consultan solos a la API de GW2).
2. Ingresa el **LI objetivo** del sale. La app arma el orden: dailies primero (valen 2 LI), luego los bosses más rápidos hasta llegar a la meta.
3. Selecciona **quiénes van hoy** en el panel de roster.
4. Si un boss no conviene hoy, usa **Descartar** — entra automáticamente el siguiente mejor.
5. El commander marca cada boss como **completado**; el siguiente se destaca solo. El progreso se guarda en su navegador aunque refresque la página.

## Cómo actualizar datos

Todo lo editable se edita **desde la misma app** (sección Biblia, Jugadores o Eventos): tiempos de bosses, LI, perfiles, notas, eventos.

- Los cambios se guardan primero en tu navegador.
- Para que **todos** los vean, pulsa **Guardar en GitHub** (requiere el token configurado en Ajustes — se configura una sola vez). El sitio se republica solo en ~1 minuto.
- Sin token: usa **Exportar JSON** y súbelo a GitHub a mano (botón lápiz sobre el archivo en `public/data/`).

## Qué archivo controla qué

| Archivo | Contenido |
|---|---|
| `public/data/wings.json` | Wings, bosses, tiempos, LI |
| `public/data/players.json` | Perfiles del roster |
| `public/data/events.json` | Ventas por evento |
| `public/data/guidelines.md` | Esta guía |

## Reglas del equipo

- Regla de oro: los dailies siempre se hacen (2 LI). Descartar es la excepción.
- Todos los bosses dan 1 LI; el daily da 2. Twisted Castle no da LI.
- Runs de LI = solo raids. Fractals y achievements se venden por evento.

## Acceso

El link de la app es público. Para editar y guardar a GitHub se necesita ser colaborador del repo — pídele acceso a Herman.
