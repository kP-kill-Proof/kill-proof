# Guidelines — KILL PROOF Sales Tool

## How to run a sale day

1. Open the app. **Today's Sale** shows the 4 Daily Raid Bounties (fetched live from the GW2 API).
2. Set the **LI target** for the sale. The app builds the run: dailies first (2 LI each), then the most efficient bosses until the target is reached.
3. Pick **who's in today** in the roster panel.
4. If a boss doesn't suit today's squad, hit **Discard (✕)** — the next best boss takes its place automatically.
5. The commander checks off each boss as **done**; the next one lights up. Progress survives a page refresh (stored in the commander's browser).

## How the order works

- Dailies always go in (golden rule) and are worth **2 LI**; every other boss gives **1 LI** (Twisted Castle gives none).
- The run is **grouped by wing** to cut downtime: if Soulless Horror is in, River of Souls follows right after instead of jumping wings.
- When picking filler bosses, the app slightly prefers bosses in wings you're already visiting, even over marginally faster kills elsewhere.

## How to update data

Everything editable lives **inside the app** (Bible, Roster, Events): boss times, LI values, member profiles, events.

- Changes are saved to your browser first.
- To publish for **everyone**, press **Save to GitHub** (needs the token set up once in Settings). The site republishes itself in ~1 minute.
- No token? Use **Export JSON** and upload the file to GitHub by hand (pencil button on the file inside `public/data/`).

## Which file controls what

| File | Contents |
|---|---|
| `public/data/wings.json` | Wings, bosses, times, LI |
| `public/data/players.json` | Squad roster |
| `public/data/events.json` | Event sales |
| `public/data/guidelines.md` | This guide |

## Team rules

- Golden rule: dailies are always done (2 