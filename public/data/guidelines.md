# Guidelines — KILL PROOF Sales Tool

## How to run a sale day

1. Open the app. **Today's Sale** shows the Daily Raid Bounties (fetched live from the GW2 API).
2. Set the **LI target** for the sale. The app builds the fastest run that matches it.
3. Pick **who's in today** in the squad panel (core members come preselected).
4. Click any boss on the left list to see its detail: mechanics, comp, duties and boon coverage.
5. If a boss doesn't suit today's squad, hit **Discard (✕)** — the optimizer recalculates the fastest path without it.
6. The commander checks off each boss as **done**; the next one lights up. Progress survives a page refresh (stored in the commander's browser).

## How the order works

- The app always matches your **LI target** with the **fastest possible set** of bosses (exact optimization over your kill times). Target 1 = the single quickest LI available.
- Daily bounties are worth **2 LI** (any encounter, strikes included); regular raid bosses give **1 LI** (Twisted Castle none). Dailies usually win on speed-per-LI, but nothing is forced beyond the target.
- Bosses without a recorded kill time are only picked when the target can't be reached without them — keep the Bible times updated.
- The run is **grouped by wing** to cut downtime: if Soulless Horror is in, River of Souls follows right after instead of jumping wings.

## How to update data

The app is **read-only** on shared data — that's what keeps everyone on the exact same version, always.

- Shared data updates are managed centrally and republish automatically (~1 minute) for the whole squad.
- Day state (checklist, who's in, discards, LI target) is the commander's own browser and resets daily.

## Which file controls what

| File | Contents |
|---|---|
| `public/data/wings.json` | Wings, bosses, times, LI |
| `public/data/players.json` | Squad roster |
| `public/data/comps.json` | Per-boss knowledge: profile, mechanics, ideal comps |
| `public/data/builds.json` | Build catalog: boons and condis each build provides |
| `public/data/events.json` | Event sales |
| `public/data/guidelines.md` | This guide |

## Team rules

- Dailies give 2 LI each; discard one and the optimizer recalculates the fastest path without it.
- LI runs = raids (plus strikes when they're the daily bounty). Fractals and achievements are sold per event.

## Access

The app link is public. Editing and saving to GitHub requires being a repo collaborator — ask Herman for access.
