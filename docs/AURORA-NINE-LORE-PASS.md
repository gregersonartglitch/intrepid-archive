# Aurora brief — The Nine medallion lore pass

**Date:** 2026-07-18  
**For:** Aurora (lore / copy)  
**Owner after edits:** Cursor applies approved lines into `index.html` `MEDALLIONS[]` (+ `data.js` where territory copy conflicts)  
**Live build when filed:** 194+  

## Goal

Make The Nine (Apkallu ring) + Tetrad card copy **internally consistent** with Hollowlands canon: Kur, Tetrad, Maxim Stone / Tower. Prefer map voice over real-world mythology dumps. No em dashes in body if house style forbids.

## Canon anchors (do not break)

- **Tetrad (4):** Utu, Rapha, Mish, Gu — cardinals. Gu is Vol2-sealed.
- **The Nine:** Sham & Mash (twins, one medallion), Elil, Ningal, An, Nin, Belu, Ae, Erra — nine *names*, eight hotspots.
- **Kur** = underworld / exile of the old gods. Tower of the Nine cages them; Maxim Stone sutures worlds.
- **Territory Elil** (`data.js` id `elil`) = *Dominion of Wind and Shadow* / perpetual twilight — **not** “the underworld.” Underworld queen voice sits with **Ningal**.

## Issues to solve (priority order)

### 1. Elil — title collision (P0 for copy)
**Current (fixed interim on map):** was “lord of the underworld”; interim now “One of The Nine of Kur — a lord of twilight…”  
**Problem:** Underworld singular fights Ningal (*Queen of the Underworld* / gods of Kur). Territory Elil is **twilight / wind-shadow**, not Kur.  
**Ask Aurora:** Final 2–3 sentence lore + whether role stays *The Shapeshifter*. Align with `data.js` `elil` twilight dominion.

### 2. Ae — god vs servant (P0)
**Role:** Lord of the Divine River  
**Lore:** “AE's servant, older than worship…”  
**Problem:** Card name is Ae; body says the medallion is Ae’s *servant*. Player can’t tell if fish = god or familiar.  
**Ask Aurora:** Pick one: (A) medallion *is* Ae, or (B) medallion is the servant and name/role should say so.

### 3. An — role vs lore mismatch (P1)
**Role:** Lord of Flight  
**Sprite:** fate / scales  
**Lore:** balance, scales, what is owed — no flight.  
**Ask Aurora:** Retitle role to match scales/fate, **or** rewrite lore to earn “Flight.”

### 4. Sham & Mash vs Utu — sun overlap (P1)
**Twins:** “God of Sunlight”  
**Utu:** sun / seasons / Bull of Heaven  
**Ask Aurora:** Differentiate (e.g. twins = dual judgment of light; Utu = celestial axis) so both can coexist.

### 5. Ningal — Ereshkigal name-drop (P1)
**Lore** opens with real-myth “Ereshkigal's child.”  
**Ask Aurora:** Keep as deep-cut, or veil to in-world parentage (“child of the first Queen of Kur”) for players who don’t know the borrow.

### 6. Nin vs Elil / Earth vs Kur (P2)
**Nin:** God of Earth, banished to Kur.  
**Ask Aurora:** One line clarifying Earth-dominion *from* exile vs Elil’s twilight surface dominion — avoid “everyone is underworld.”

### 7. Counting / framing (P2)
Confirm public-facing line: “The Nine” = nine gods with twins counting as two. Optional one-line for sealed Vol2 four (Gu, Nin, Belu, Ae, Erra) vs Vol1-revealed ring.

## Deliverable format (please)

For each of **Elil, Ae, An, Sham & Mash, Ningal** (and Nin if touched):

```
name: …
role: …
lore: "…"   // 2–4 sentences, map card voice
notes: why this fixes the issue
```

Territory conflicts (only if needed): `data.js` id + new `desc` / `lore`.

## Out of scope

- Hotspot positions / artPosition crops  
- Unlock thresholds  
- Reader / PDF gates  

## Interim shipped without waiting

- Elil underworld → Kur/twilight wording (build 195+) — replace freely when Aurora returns final.
