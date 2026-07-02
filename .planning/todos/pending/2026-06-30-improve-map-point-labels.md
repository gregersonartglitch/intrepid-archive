---
created: 2026-06-30T13:59:00Z
title: Improve map point labels
area: ui
files:
  - index.html
  - fog.js
---

## Problem

Some visible point labels are partially obscured by fog, especially around the early map cluster near Sabella's Hut, The Crossing Pool, Dawn Spear Clearing, Ashal, Monastery, and The Gates. The labels also still read a little too large and are positioned too far from their corresponding points.

The desired direction is for labels to be easier to associate with each point: smaller, closer to the marker, and center-aligned above the point where possible.

## Solution

Backlog item only for now. Later, review label CSS and marker label anchoring in `index.html`, plus fog layering in `fog.js`, so labels remain readable without floating too far from their locations. Consider centering labels above markers, reducing label scale, and ensuring fog does not visually cover active/known label text.
