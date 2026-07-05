---
name: Hospital Capacity Map Yala
description: แผนที่แสดงศักยภาพโรงพยาบาลและศูนย์สั่งการฉุกเฉิน
colors:
  primary-alert: "#ef4444"
  primary-rescue: "#06b6d4"
  neutral-bg: "#f8fafc"
  neutral-surface: "#ffffff"
  ink-default: "#0f172a"
  ink-muted: "#64748b"
typography:
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 900
rounded:
  md: "8px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary-alert}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "12px 24px"
  card-surface:
    backgroundColor: "{colors.neutral-surface}"
    rounded: "{rounded.xl}"
    padding: "16px"
---

# Design System: Hospital Capacity Map Yala

## 1. Overview

**Creative North Star: "The Lifeline Terminal"**

This system serves as a digital lifeline. It must be decisive, fast, and dense with critical information while remaining scannable. The aesthetic philosophy prioritizes high-contrast urgency and layered structural depth over decorative flair. It explicitly rejects cluttered, outdated government interfaces, tiny interactive targets, and generic low-contrast SaaS themes. 

**Key Characteristics:**
- Information density balanced by aggressive contrast and clear hierarchy.
- Confident interactive targets optimized for desktop/tablet command center operators (not necessarily giant mobile-field buttons).
- Layered elevation strategy to bring actionable data forward.
- Unapologetically bold color usage reserved strictly for states and alerts.

## 2. Colors

A high-contrast slate foundation punctuated by aggressive, utilitarian alert colors.

### Primary
- **Command Red** (`#ef4444` / Tailwind `red-500`): Used for critical actions, Narinthorn Command branding, and high-priority alerts.
- **Rescue Cyan** (`#06b6d4` / Tailwind `cyan-500`): Used for rescue unit coordination, active routes, and secondary actions.

### Neutral
- **Slate Base** (`#f8fafc` / Tailwind `slate-50`): The default canvas background. Provides a cool, clinical backdrop.
- **Surface White** (`#ffffff`): For elevated cards and primary reading surfaces.
- **Ink Primary** (`#0f172a` / Tailwind `slate-900`): For primary body text and high-emphasis labels.
- **Ink Muted** (`#64748b` / Tailwind `slate-500`): For secondary metadata, timestamps, and subtle borders.

### Named Rules
**The Color is Data Rule.** Bold colors (Red, Cyan, Amber, Emerald) are reserved strictly for status, triage levels, and primary actions. Do not use them decoratively.

## 3. Typography

**Display Font:** ui-sans-serif (System Default)
**Body Font:** ui-sans-serif (System Default)

**Character:** Technical, highly legible, and unopinionated to ensure maximum reading speed.

### Hierarchy
- **Headline** (900, clamp(1.5rem, 3vw, 2.25rem), tight): Hero numbers, dashboard titles.
- **Title** (700, 1.25rem, snug): Card headers, section titles.
- **Body** (400, 1rem, normal): Patient details, descriptions. Max line length: 70ch.
- **Label** (800, 0.75rem, uppercase): Metadata, table headers, triage tags.

### Named Rules
**The Legibility Floor Rule.** Body text must never drop below `slate-600` on light backgrounds. Contrast ratios must meet or exceed WCAG AA (4.5:1).

## 4. Elevation

The system uses a "Layered & Floating" philosophy. Elements stack logically on the z-axis, using robust shadows to separate critical floating actions (maps, panels, alerts) from the ground layer.

### Shadow Vocabulary
- **Card Shadow** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1)`): Standard resting state for information cards.
- **Floating Action Shadow** (`box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1)`): Used for the collapsible hospital status panel and urgent modal dialogs.
- **Alert Glow** (`box-shadow: 0 0 20px rgba(239,68,68,0.5)`): Reserved for Disaster Mode alerts to pull immediate focus.

### Named Rules
**The Map Stratosphere Rule.** The map is the absolute ground layer (z-0). Everything that floats above it (markers, tooltips, panels) must cast a distinct shadow to communicate its priority over the geographic data.

## 5. Components

### Buttons
- **Shape:** Chunky and rounded (12px radius, `rounded-lg`).
- **Primary:** Command Red or Rescue Cyan background, white text, large padding (min 44px touch target).
- **Hover / Focus:** Slight scaling (`active:scale-95`) with transition.

### Cards / Containers
- **Corner Style:** Large (16px radius, `rounded-xl`).
- **Background:** Solid Surface White or Dark Slate (`slate-800`).
- **Shadow Strategy:** Resting Card Shadow.
- **Border:** Subtle 1px border (`border-slate-200`) to crisp the edge.
- **Internal Padding:** Generous (16px to 24px) to prevent data crowding.

### Inputs / Fields
- **Style:** Light slate background (`bg-slate-50`), subtle border, 12px radius.
- **Focus:** Sharp 2px ring of the primary context color (Red or Cyan).

### Triage Badges
- **Style:** High-saturation background matching the triage level (Red, Yellow, Green, Black/White) with bold, contrasting text. Minimal corner radius (4px) to look like a physical medical tag.

## 6. Do's and Don'ts

Strict guardrails to prevent generic SaaS drift and ensure emergency-grade usability.

### Do:
- **Do** use large, confident touch targets (minimum 44x44px) for all interactive elements.
- **Do** map colors directly to physical triage realities (Red = Critical/CPR, Yellow = Urgent, Green = Non-urgent).
- **Do** use `slate-900` for primary data points to ensure they are the highest contrast elements on the page.

### Don't:
- **Don't** use decorative glassmorphism or excessive background blurs on primary data surfaces.
- **Don't** use tiny uppercase tracked eyebrows (01 / ABOUT) above sections. This is a command center, not a marketing page.
- **Don't** design buttons or inputs that are small or hard to tap. (Matches anti-reference: "No tiny, hard-to-click buttons").
- **Don't** use generic government-style layouts with dense, unstructured text blocks. (Matches anti-reference: "No outdated government UI patterns").
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent on cards.
