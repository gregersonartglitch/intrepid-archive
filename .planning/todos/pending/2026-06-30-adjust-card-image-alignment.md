---
created: 2026-06-30T13:43:00Z
title: Adjust card image alignment
area: ui
files:
  - index.html
  - assets/medallions/
---

## Problem

The awakened Apkallu / medallion discovery card images are visually off-center inside their circular presentation frame. In the captured example, the Nin scorpion image sits too far within the crop, making the circular composition feel misaligned against the card border and surrounding frame art.

This likely affects multiple medallion/card images, not only Nin.

## Solution

Review the discovery card image presentation styles and/or individual medallion asset positioning. Adjust object-fit, object-position, crop container sizing, or per-image offsets so all awakened medallion images sit centered in the circular card frame.
