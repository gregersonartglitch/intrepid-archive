---
created: 2026-06-30T14:32:00Z
title: Optimize dossier image loading
area: ui
files:
  - dossier/index.html
  - dossier/
---

## Problem

The character dossier loads correctly, but the graphics take a noticeable moment to appear. The page currently uses large full-size character PNGs for both the sidebar avatars and the main detail portrait, so the browser has to decode heavy images immediately.

## Solution

Backlog item only for now. Later, generate smaller thumbnail assets for the left roster avatars, use those thumbnails in the sidebar, and keep the full-size PNGs for the main portrait/full-size click. Consider eager-loading only the active character portrait and lazy-loading the rest.
