---
name: Rastero
description: Every image format and quality, measured side by side, in a zero-hue proofing booth.
colors:
  ground: "#181818"
  rail: "#1a1a1a"
  raised: "#202020"
  hover: "#222222"
  float: "#242424"
  selected: "#292929"
  hairline: "#2c2c2c"
  hairline-strong: "#3a3a3a"
  hairline-hover: "#4a4a4a"
  solid: "#2a2a2a"
  solid-hover: "#333333"
  proof-backing: "#111111"
  checker-light: "#2b2b2b"
  checker-dark: "#212121"
  handle: "#f4f4f4"
  ink: "#ececec"
  ink-2: "#a3a3a3"
  ink-3: "#8a8a8a"
  accent: "#19caf7"
  accent-hover: "#4dd6f9"
  accent-press: "#10b3dc"
  accent-ink: "#062530"
  accent-soft: "rgb(25 202 247 / 0.14)"
  danger: "#ff7a6b"
typography:
  display:
    fontFamily: "'Inter Variable', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "'Inter Variable', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Inter Variable', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "'Inter Variable', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "'cv11'"
  body-sm:
    fontFamily: "'Inter Variable', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "'Inter Variable', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
  micro:
    fontFamily: "'Inter Variable', 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  proof: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  pill: "10px"
  full: "9999px"
spacing:
  2xs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  gutter-compact: "14px"
  gutter: "22px"
  stage-inset: "34px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "35px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-active:
    backgroundColor: "{colors.accent-press}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "35px"
  button-ghost-hover:
    backgroundColor: "{colors.hover}"
  button-ghost-active:
    backgroundColor: "{colors.selected}"
  button-solid:
    backgroundColor: "{colors.solid}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "35px"
  button-solid-hover:
    backgroundColor: "{colors.solid-hover}"
  button-sm:
    typography: "{typography.body-sm}"
    padding: "0 12px"
    height: "30px"
  button-lg:
    padding: "0 20px"
    height: "42px"
  button-link:
    textColor: "{colors.accent}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
  button-link-hover:
    textColor: "{colors.accent-hover}"
  count-badge:
    backgroundColor: "rgb(6 37 48 / 0.16)"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 6px"
    height: "20px"
  count-badge-ghost:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.ink-2}"
  icon-button:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    size: "32px"
  icon-button-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.ink}"
  icon-button-pressed:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.accent}"
  view-tools-pill:
    backgroundColor: "{colors.rail}"
    rounded: "{rounded.pill}"
    padding: "4px"
  menu:
    backgroundColor: "{colors.float}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "6px"
    width: "240px"
  menu-item:
    rounded: "{rounded.sm}"
    padding: "6px 10px"
    height: "34px"
  menu-item-hover:
    backgroundColor: "{colors.selected}"
  notice:
    backgroundColor: "{colors.float}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: "8px 8px 8px 16px"
  rail-row:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "0 18px 0 22px"
    height: "70px"
  rail-row-hover:
    backgroundColor: "{colors.hover}"
  rail-row-selected:
    backgroundColor: "{colors.selected}"
  patch:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.ink-2}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    width: "92px"
  patch-picked:
    textColor: "{colors.accent}"
  proof:
    backgroundColor: "{colors.proof-backing}"
    rounded: "{rounded.proof}"
  proof-handle:
    backgroundColor: "{colors.handle}"
    textColor: "{colors.rail}"
    rounded: "{rounded.full}"
    size: "34px"
  slider-thumb:
    backgroundColor: "{colors.handle}"
    rounded: "{rounded.full}"
    size: "18px"
  brand-mark:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.headline}"
    size: "26px"
  inspector-download:
    backgroundColor: "{colors.solid}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "0 16px"
    height: "48px"
---

# Design System: Rastero

## Overview

**Creative North Star: "The Proofing Booth"**

Rastero is a press-proof viewing booth for compressed images, not an upload form. The room is true-neutral graphite with zero hue, so the only colour on screen belongs to the photographs and to one process cyan. Every result is already measured along the proof's edge: the proof sits bare in the middle, its caption and readout ride the margin above it, and a strip of 1:1 detail patches runs underneath, led by the original's own crop as the reference every result is judged against.

Density is that of a working instrument: a 54px top bar, a ~300px rail of image rows, a large proof, and quiet 13–16px type with tabular figures for every number. Surfaces are flat planes separated by hairlines; floating layers (menus, notices, the shortcuts panel) rise by one tone step and a stronger hairline, never by a drop shadow. Motion is short and practical: things fade in where they will stay, the blurred thumbnail holds the frame while the sharp image decodes, and nothing waits on a transition.

Confirmed rejections: the dashed drop box feeding a list of percentage badges; registration crosshairs or corner pointers around the proof (removed at the user's request); glow, glass and showcase effects; loud colour, emoji and cute illustration.

**Key Characteristics:**
- Zero-hue graphite ground (#181818 family); photographs and one cyan are the only colour.
- The proof is a bare image on a 1px 6% white hairline; transparent images sit on a checkerboard.
- Readouts live in the margins around the proof; results land in place without layout jumps.
- Flat planes, tone-and-hairline elevation, no drop shadows on floating layers.
- Inter Variable with `cv11`; tabular figures for every size, dimension, count and quality.
- A pixel-R brand mark whose cells shrink left to right, on a cyan tile.

## Colors

A true-neutral graphite ladder carrying a single process cyan, with one coral reserved for errors.

### Primary
- **Process Cyan** (`accent`): the brand mark tile, the primary action ("Download all", "Choose images"), the picked result (patch outline, check badge, picked figures, tier radio), savings figures in the rail and summary, the slider fill, batch and encode progress lines, focus rings, and link buttons. Its hover (`accent-hover`) lifts lighter, its press (`accent-press`) sinks deeper.
- **Cyan Ink** (`accent-ink`): text and glyphs set on cyan (primary button labels, the pixel R, check marks). Never used on graphite.
- **Cyan Wash** (`accent-soft`): text selection only.

### Neutral
- **Booth Graphite** (`ground`): the app surround, top bar, sticky table header and scrollbar gutter.
- **Rail Graphite** (`rail`): the image rail and the view-tools pill; one step off the ground so the rail reads as a separate plane.
- **Raised Band** (`raised`): the selected row band in the proof table.
- **Hover Tone** (`hover`): hover on rows, ghost buttons, icon buttons and tier rows; also the empty patch frame.
- **Float Tone** (`float`): menus, notices, the shortcuts panel.
- **Selection Tone** (`selected`): the current rail row, pressed icon buttons, menu-item hover/focus, ghost-button press, the neutral count badge.
- **Hairline** (`hairline`) / **Strong Hairline** (`hairline-strong`) / **Hover Hairline** (`hairline-hover`): plane dividers; ghost-button and floating-layer borders plus the slider track; hovered ghost borders, hovered patches and table cells, the loupe frame and the tier radio ring.
- **Solid Object** (`solid`, hover `solid-hover`): the neutral solid button used for single-file downloads and secondary actions; carries a 6% white top inset highlight.
- **Proof Backing** (`proof-backing`): the dark behind the proof canvas, loupe and inspector crops.
- **Checkerboard** (`checker-light` / `checker-dark`): alpha backing for transparent images, 16px squares on the proof, 12px on patches and the inspector.
- **Handle White** (`handle`): the before/after divider line and its knob, and the slider thumb: the only near-white objects in the UI.
- **Ink** (`ink`), **Ink 2** (`ink-2`), **Ink 3** (`ink-3`): primary text; secondary figures and captions; tertiary hints, separators, counts and disabled menu text.
- **Error Coral** (`danger`): failed encodes and unreadable files, always paired with words.

### Named Rules
**The Photographs Own the Colour Rule.** Every surface, border and text colour is zero-chroma graphite. If a new element needs a hue that is not Process Cyan or Error Coral, it does not get one.

**The One Cyan Rule.** Cyan marks exactly four things: the brand, the primary action, what is picked or focused, and bytes saved. A secondary action (download one file, choose a folder, apply to all) is a solid graphite object, never cyan.

**The Spelled-Out State Rule.** State is never colour alone: picked patches also carry a check badge and outline, the current rail image carries an outline on its thumbnail, errors carry text, progress lines always sit beside words.

## Typography

**Display Font:** Inter Variable (with Inter, ui-sans-serif, system-ui, -apple-system, sans-serif)
**Body Font:** the same family
**Label/Mono Font:** the same family; figures switch to tabular numerals

**Character:** One neutral grotesk at small, calm sizes with character variant `cv11` (single-storey a), so the photographs, not the lettering, carry the page. Weight does the hierarchy work sparingly.

### Hierarchy
- **Display** (600, 1.75rem, 1.2, −0.025em): the empty-state headline only; drops to the Headline size (1.25rem) at ≤860px.
- **Headline** (600, 1.25rem, −0.02em): the "Rastero" wordmark beside the logo mark.
- **Title** (400, 1rem, 1.4): proof caption and readout, quality label, inspector section headings (500), empty-state lead (max 44ch).
- **Body** (400/500, 0.9375rem, 1.4): the base size: buttons (500), rail names (500), strip labels, patch quality and size, table cells.
- **Body Small** (400, 0.875rem): menus, batch summary, notices, shortcut lists, small buttons, facts row.
- **Label** (400/500, 0.8125rem): counts, rail file sizes, dimensions, menu hints and group labels, loupe and crop captions; also patch figures when a patch is ≤84px wide. Sentence case; never uppercase-tracked.
- **Micro** (400, 0.75rem): patch quality and size captions only, and only when a patch shrinks to ≤66px wide (container query), so figures stay whole instead of truncating. Not for general UI text.

### Named Rules
**The Tabular Figures Rule.** Every byte size, dimension, quality value, percentage and count is set in tabular numerals so columns of results line up and do not jitter as encodes stream in.

**The Quiet Weight Rule.** UI text is 400 or 500. Weight 600 is reserved for the wordmark, the empty-state headline, count badges and the "1:1" tool label.

## Layout

A fixed application grid: a 54px top bar across the top, a 305px image rail on the left (272px at ≤1280px), and the stage filling the rest. The top bar is an `auto minmax(0, 1fr) auto` grid with 24px column gaps: logo and wordmark left, the batch summary centred in the flexible middle column, actions right with 16px gaps. Its bottom hairline doubles as batch progress.

The stage stacks the proof area (flex-filling) over the strip and the quality bar. The proof is sized to fit its area with room for the caption row above and the view-tools pill in the right margin (84px side margins); the caption (name, dimensions, size) sits left and the result readout plus a labelled Download button sits right, level with the proof's top edge. When the stage is narrower than 700px the proof turns compact: 16px side margins aligned with the caption row, height capped at 60% of the viewport, the view-tools pill horizontal beneath it, and the stage scrolls. The strip and quality bar share a 34px left inset. Strip groups (Original, AVIF, WebP, JPEG, PNG) divide by vertical hairlines; patches share space from 60px to 92px wide, then the strip scrolls horizontally with a 56px edge fade rather than truncating figures.

The proof table (grid view, toggled with G) spans rail and stage: a scrolling table with sticky header and 64px rows, plus an inspector column `clamp(340px, 30%, 460px)` that holds a proof, a 1:1 crop pair, tier rows, the quality control and a 48px download object pinned to the bottom.

Spacing is a practical rhythm of 4 / 8 / 12 / 16 / 24px with two recurring gutters: 22px (top bar, rail rows, notice offset) and 14px on compact screens.

Responsive behaviour, all observed:
- ≤1280px: rail narrows to 272px.
- ≤1240px: the Formats button drops its text label (icon + count remain).
- ≤1180px: the summary drops its "left" figure.
- ≤1100px: the grid inspector hides.
- Stage narrower than 700px, or any single-column layout: compact proof (16px side margins, a 280px minimum height, horizontal view-tools pill under the proof).
- ≤860px: single column; the rail becomes a horizontal strip of 51px thumbs with savings beneath; the summary hides; the stage scrolls; strip patches fix at 72px. The top bar respects the top safe area and keeps only Formats and Add; downloads move to the phone action bar, and notices rise above it.
- ≤560px: top-bar buttons collapse to icons and the wordmark shows the mark only.
- Height ≤760px: stage controls tighten.
- Coarse pointers: buttons grow to 42px (small 38px), icon buttons to 40px, the slider thumb to 26px. Touch-only devices hide the keyboard-shortcuts tool, and the empty state offers "Choose photos" alone (no folder picker, drop or paste hint).
- Container queries: the proof head drops dimensions below 600px and the Download label below 420px; patch figures step down to 13px and 12px below 84px and 66px.

### Named Rules
**The Margins Readout Rule.** Names, sizes, formats and qualities sit in the margins around the proof, never printed over the image. The loupe, an on-demand tool, is the only thing seated inside the proof, in its bottom-right corner.

**The No-Jump Rule.** Results land in place: patches hold a square frame with a progress line until their pixels arrive, rail thumbs and the proof hold a skeleton, and figures never reflow the strip.

## Elevation & Depth

Depth is tonal. Planes step from ground (#181818) to rail, hover, float and selection tones, each separated by a 1px hairline. Floating layers (menus via the native popover API, notices, the shortcuts panel) use the float tone plus a strong hairline and 8px corners, with no drop shadow. Loading uses a soft diagonal sweep across graphite (1.6s) or, on the proof, the image's own thumbnail blurred 14px until the sharp image fades in over 180ms.

### Shadow Vocabulary
- **Proof hairline** (`box-shadow: 0 0 0 1px rgb(255 255 255 / 0.06)`): the only edge the proof and inspector proof carry.
- **Solid top light** (`box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.06)`): the top edge of solid neutral buttons, making them read as objects.
- **Contact shadow, divider knob** (`box-shadow: 0 2px 10px rgb(0 0 0 / 0.35)`): the draggable before/after handle.
- **Contact shadow, slider thumb** (`box-shadow: 0 1px 4px rgb(0 0 0 / 0.5)`): the quality slider thumb.
- **Drag ring** (`box-shadow: inset 0 0 0 2px rgb(25 202 247 / 0.55)`): the empty state while files are dragged over it, with a faint surface tint (#1a1d1e).

### Named Rules
**The Tone-and-Hairline Rule.** Anything that floats rises by one tone step and a hairline. Drop shadows are not part of the booth.

**The Grab Exception.** Only objects the hand grabs (the divider knob, the slider thumb) carry a small contact shadow.

## Shapes

Softly squared and small: 4px on patches, thumbs, menu items and labels; 6px on buttons and icon buttons; 8px on menus, notices, the shortcuts panel and the inspector download. The proof and inspector proof keep a near-square 2px corner so the image reads as a print, not a card. The view-tools pill and count badges use 10px; the divider knob, slider thumb, check badge and tier radio are circles.

The brand mark is a 32-unit cyan tile with 8-unit corners carrying an R drawn on a 5×7 raster on a 3.35 pitch, in Cyan Ink. Its cells shrink gently column by column (3.1, 2.95, 2.75, 2.55, 2.3 units): an image getting smaller as it compresses, while still reading as an R at 16px favicon size. It renders at 26px in the top bar and 52px in the empty state; the favicon, app icons and OG card use the same drawing.

### Named Rules
**The Bare Proof Rule.** The proof is the image, a 2px corner and a 6% white hairline, on a checkerboard if it has alpha. No frames, corner marks, crosshairs, captions over the image, or dashed boxes.

## Components

### Buttons
Solid, compact and legible; every button is an object with a clear label.
- **Shape:** gently squared (6px), 35px tall, 16px sides, 8px icon gap, 16px icons, weight 500.
- **Primary:** Process Cyan with Cyan Ink text; used once per view for the main exit ("Download all" with a count badge, "Choose images"). Hover lightens, press deepens, 150ms ease-out.
- **Ghost:** transparent with a strong hairline border and Ink text; top-bar Formats and Add images. Hover takes the hover tone and hover hairline; press takes the selection tone.
- **Solid:** the neutral object (#2a2a2a) with a 6% top light; single-file Download beside the readout, Choose folder, Apply to all images.
- **Small:** 30px tall, 12px sides, 14px text, 15px icons (readout Download, Apply to all).
- **Split:** a main action fused to a 32px caret that opens a menu; ghost halves share a border, primary halves divide with a faint ink inset line.
- **Link:** cyan text with an underline on hover (Reset, sample photos); disabled drops to Ink 3.
- **Disabled:** 40% opacity (35% for icon buttons). Reset stays visible and disabled until a result is tuned.
- **Focus:** a 2px Process Cyan outline at 2px offset on every focusable element.

### Chips
- **Count badge:** 20px pill, 13px/600 tabular figure; a faint ink wash inside cyan buttons, the selection tone with Ink 2 text inside ghost buttons.

### Cards / Containers
- **Corner Style:** none for planes; 8px for floating layers; 6px for the inspector tier list.
- **Background:** ground, rail and float tones only.
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** 1px hairline between planes and groups; strong hairline around floating layers.
- **Internal Padding:** 6px for menus, 14–16px for panels, 16–18px for the inspector.

### Inputs / Fields
- **Quality slider:** 4px track in the strong hairline tone, filled with cyan up to the value; 18px Handle White thumb with a contact shadow that scales to 1.12 while pressed. Focus draws the cyan ring around the thumb.
- **Tier rows:** 40px radio rows (format, quality, saving, size bar, radio); the checked row takes a 2px cyan outline, cyan figures and a filled cyan radio.

### Navigation
- **Top bar:** logo + wordmark left, batch summary centred in the flexible middle column ("8 images · 5.56 MB → 1.04 MB · −81%", savings in cyan), Formats / Add images / Download all right. A 1px cyan line along its bottom edge tracks batch progress and fades when done.
- **Image rail:** folder headers (54px, folder icon, name, count) over 70px rows: 51px thumb, name (500) with size beneath, and the saving in cyan on the right. Hover takes the hover tone and swaps the saving for a remove button. The current row takes the selection tone and its thumbnail a 2px cyan outline at 2px offset, at every width. Rows use content-visibility so hundreds of images stay cheap.
- **Mobile:** the rail becomes a horizontal thumb strip; the thumbnail outline carries the selection.
- **Phone action bar** (≤860px): fixed to the bottom over the safe area, ground tone above a hairline. A solid Download (label plus "size · format" beneath, size first so truncation cuts the format) shares the row with the cyan Download all split, whose menu opens upward.

### Menus and Notices
- **Menu:** native popover, float tone, strong hairline, 8px corners, 240px minimum, 34px items with 16px Ink 2 icons, cyan check marks, trailing hints in Ink 3, hairline separators.
- **Notice:** bottom-left, float tone and strong hairline, text plus a dismiss icon button; rises 8px and fades in over 220ms. On phones it sits above the action bar.

### Proof
The signature component. A before/after split with a 1px Handle White vertical divider and a 34px Handle White knob; original on the left, result on the right. Zoom toggles between fit and actual pixels (grab-to-pan at 1:1). While an image decodes, its thumbnail blurred 14px holds the frame; the sharp layer fades in over 180ms once decoded, and neighbouring images decode ahead. On touch, a drag on the photo moves the divider only once it goes sideways, so vertical swipes scroll the page; the knob always drags.

### View Tools Pill
A 4px-padded rail-tone pill with a hairline border, vertical in the right margin (Fit, 1:1, Loupe, Keyboard, Remove) and horizontal under the proof when the stage is compact. Remove also shows on an unreadable image, so it can be cleared. Pressed tools take the selection tone with a cyan glyph.

### Loupe
A pixelated 1:1 magnifier seated in the proof's bottom-right corner, 1px apart halves (Original | result) framed by the hover hairline with 6px (`md`) corners, each labelled in a small dark caption chip.

### Detail Patch Strip
Square 1:1 crops from the same region of every result, grouped by format under "AVIF 3 results"-style labels, each with quality and size beneath in tabular figures. The Original group leads with the source crop. Hover draws a 1px hover-hairline outline; the pick draws a 2px cyan outline, a 22px cyan check badge and cyan figures. Pending patches show a progress line with text; failed ones show coral text. Pixels fade in over 220ms when they land.

### Inspector Download
A 48px solid object at the bottom of the inspector: download icon, the verb, then the exact file name and size right-aligned in Ink 2.

### Empty State
The 52px logo mark, one Display headline ("Drop images or a folder"), a Title lead, Choose images (primary) and Choose folder (solid) at 42px, a paste/sample hint, and a Reads / Writes / Runs facts row at the bottom. Dragging tints the whole surface and draws an inset cyan ring; there is no dashed box.

## Do's and Don'ts

### Do:
- **Do** keep every surface, border and text colour zero-chroma graphite from the token ladder; let the photographs carry the colour.
- **Do** reserve Process Cyan for the brand mark, the one primary action, the pick/focus, and bytes saved.
- **Do** make secondary actions solid graphite objects (#2a2a2a with a 6% top light), labelled with a verb.
- **Do** raise floating layers by the float tone and a strong hairline with 8px corners.
- **Do** set every figure in tabular numerals and keep UI text at 400/500.
- **Do** place names and measurements in the margins around the proof and let results land in place behind skeletons or progress lines.
- **Do** show transparent images on the checkerboard and give the proof only its 1px 6% white hairline.
- **Do** pair every colour-coded state with text or a shape (check badge, outline, words).
- **Do** keep transitions at 150ms or 220ms on the `cubic-bezier(0.16, 1, 0.3, 1)` ease-out, and collapse them under reduced motion.

### Don't:
- **Don't** put registration crosshairs, corner pointers or frames around the proof.
- **Don't** build a dashed drop box or a list of percentage badges as the entry point.
- **Don't** give menus, notices or panels drop shadows, glow or glass blur.
- **Don't** introduce a second accent hue or use cyan on a secondary download.
- **Don't** print readouts over the image or truncate figures to fit; let the strip scroll with an edge fade.
- **Don't** use uppercase-tracked eyebrows, emoji or decorative illustration.
