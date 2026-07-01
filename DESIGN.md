---
version: alpha
name: VibeReview
description: A lightweight project board for vibe-coded apps, external project reviews, and threaded feedback.
colors:
  primary: "#0057C2"
  onPrimary: "#FFFFFF"
  secondary: "#FF6600"
  onSecondary: "#1B1D1D"
  background: "#FCF9F8"
  surface: "#FCF9F8"
  surfaceMuted: "#EEEDEC"
  surfaceAccent: "#E7E5E4"
  onSurface: "#1B1D1D"
  onMuted: "#414653"
  border: "#C1C6D7"
  error: "#C52020"
  onError: "#FFFFFF"
typography:
  brand:
    fontFamily: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 1rem
    fontWeight: 700
    lineHeight: 1.375rem
    letterSpacing: 0
  headline:
    fontFamily: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.75rem
    letterSpacing: 0
  section:
    fontFamily: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 1rem
    fontWeight: 600
    lineHeight: 1.375rem
    letterSpacing: 0
  body:
    fontFamily: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.25rem
    letterSpacing: 0
  bodySmall:
    fontFamily: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1rem
    letterSpacing: 0
  label:
    fontFamily: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
    fontSize: 0.6875rem
    fontWeight: 500
    lineHeight: 0.875rem
    letterSpacing: 0
  mono:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace
    fontSize: 0.75rem
    fontWeight: 400
    lineHeight: 1rem
    letterSpacing: 0
rounded:
  none: 0px
  sm: 2px
  md: 4px
  lg: 8px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
components:
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.onSurface}"
    typography: "{typography.body}"
  nav-logo:
    textColor: "{colors.onSurface}"
    typography: "{typography.brand}"
  nav-link-active:
    textColor: "{colors.primary}"
    typography: "{typography.body}"
  nav-link-muted:
    textColor: "{colors.onMuted}"
    typography: "{typography.body}"
  page-title:
    textColor: "{colors.onSurface}"
    typography: "{typography.headline}"
  section-title:
    textColor: "{colors.onSurface}"
    typography: "{typography.section}"
  body-copy:
    textColor: "{colors.onSurface}"
    typography: "{typography.body}"
  meta-copy:
    textColor: "{colors.onMuted}"
    typography: "{typography.bodySmall}"
  table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: 8px
  table-row-hover:
    backgroundColor: "{colors.surfaceMuted}"
    textColor: "{colors.onSurface}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.onPrimary}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: 40px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: 40px
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.onError}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: 40px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: 12px
    height: 40px
  badge:
    backgroundColor: "{colors.surfaceMuted}"
    textColor: "{colors.onMuted}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 4px
  external-review-badge:
    backgroundColor: "{colors.surfaceAccent}"
    textColor: "{colors.onSurface}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: 4px
  accent-rule:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.onSecondary}"
    height: 2px
  owner-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSecondary}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: 4px
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  feedback-comment:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    padding: 16px
---

## Overview

VibeReview should feel like a focused project board, not a dashboard, CRM, or marketing site. The main workflow is simple: browse public projects, open a project post, read or write threaded feedback, and manage your own profile and project archive.

The product should preserve a bulletin-board rhythm. Pages are mostly text-first, row-first, and link-first. Use dense but readable spacing, visible separators, and restrained controls. The UI should make project ownership, external review ownership, visibility, and feedback activity clear without adding management-tool weight.

## Colors

The palette uses a warm near-white background, ink text, a single blue primary action color, and a small orange accent. Blue is reserved for navigation state, links, primary buttons, active filters, and focus. Orange should be sparse and should not dominate the page.

Use muted warm gray surfaces for hover states, metadata chips, tags, and empty states. Avoid full-screen gradients, decorative blobs, and saturated panels. Borders should remain visible enough to make rows and comment threads easy to scan.

## Typography

Inter is the default typeface. Keep headings compact: page titles use 20px, section headings use 16px, body text uses 14px, and metadata uses 12px or 11px. Letter spacing stays at 0.

Do not use oversized hero typography inside boards, project pages, forms, or profile pages. The design should prioritize quick scanning over visual spectacle.

## Layout

Use a centered max-width content column around 1100px with 12px mobile side padding and 24px desktop side padding. Prefer full-width sections with border separators over floating cards.

Discover is a table-like board. Project rows should be clickable, compact, sortable where useful, and able to display owner, reviewer, category tags, tools, feedback count, favorite state, and last activity without needing a separate "open" button.

Project detail pages place compact project metadata at the top, followed by the Markdown body, then feedback as a thread. Feedback composition should be collapsed until the user asks to write feedback.

## Elevation & Depth

Avoid decorative shadows. Depth is expressed with borders, row hover states, section dividers, and clear spacing. Use modals only for focused edits such as profile settings or destructive confirmation.

## Shapes

Shapes should be mostly square or subtly rounded. Buttons, badges, inputs, and repeated items use 0px to 2px radius by default. Cards can use up to 8px only when a truly framed repeated item or modal needs it.

## Components

Navigation is global and consistent across pages. The logo links to Discover. Authenticated users see My, Profile, Settings, and a logout control. Active navigation is blue and bold.

Forms should be single-column by default. New project and edit project should share the same form structure. The edit page should focus on editing only, with revision history as a side panel when available and no feedback thread on the edit page.

Markdown content is a first-class surface. Project descriptions render headings, lists, tables, blockquotes, code, and links with modest spacing. Markdown should never look like a separate app skin.

Feedback is a thread. A feedback item is read-only until its author clicks edit. Replies are nested under the parent item and use the same permission model. The author name is rendered from the logged-in user or profile data, not as a freeform text input.

## Do's and Don'ts

Do keep the interface close to a clean board: compact rows, direct links, clear ownership labels, and simple comment threads.

Do show project type clearly: own project, external public project review, claimed owner, and reviewed by.

Do make MCP/API usage agent-friendly through documentation and token management, but keep developer features out of the default browsing path.

Don't turn Discover into a card grid unless the user explicitly asks for a visual gallery.

Don't add heavy project-management surfaces to the public experience. Kanban, task tracking, and queues can exist later behind My or Settings, but the default view stays light.

Don't use gradients, image-only heroes, large empty cards, or decorative shapes for routine product screens.
