---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Rastero app surface

Scope: the whole single-page app (`src/App.tsx` and its components). Mode: Operate.
Audience and job: developers first, designers second; decide which format and quality to ship for one image or a folder of hundreds, then leave with the files.
Approved comp: `.impeccable/mocks/comp-a-sheet-strip.png` (stage view). Secondary approved view: `.impeccable/mocks/comp-b-proof-grid.png` (grid view, toggled with G / E). Carry over from comp C: the 1:1 loupe.
User downgrades of the comp, in their words: result patches → "1:1 detay kırpıntısı" (1:1 detail crops); split Add/Download buttons and a Reset that is disabled until something is tuned → "Kalsın"; registration crosshairs → "bu köşelerdeki pointerlar iğrenç" (removed everywhere).
Memorable moment: every format and tier is already on the proof, measured, the moment an image lands; the original's 1:1 crop leads the strip as the reference every result is judged against.

## Direction contract

THESIS: A proofing booth, not an upload form. Every result is already measured along the proof's edge; refuse the dashed drop box feeding a list of percentage badges.

OWN-WORLD: True-neutral graphite with zero hue (#181818 surround, #1a1a1a rail, #292929 selection, #2c2c2c hairlines) so only photographs carry colour. One process cyan (#19caf7) for the brand mark, selection, the primary action and savings figures. The proof is a bare image on a 1px 6% white hairline; transparent images sit on an editor checkerboard. Inter, tabular figures. Flat planes; floating layers rise by tone and hairline, no drop shadows. Mark: a pixel R whose cells shrink left to right.

STORY: Drop images or a folder; each becomes a proof with every result at its edge; judge by pixels (split divider, 1:1 zoom, loupe, detail patches against the original's); sign off one result per image (auto-picked until overridden) or apply one choice to all; download one file, a ZIP of all, or write into a folder.

FIRST VIEWPORT: 54px top bar: logo and wordmark left, batch summary centre, Formats, Add images and cyan "Download all" with a count right. ~300px left rail of image rows (thumb, name, size, saving). Stage: caption left and result readout with a Download button right above the proof; before/after divider; view tools in a pill in the right margin. Below: Original reference patch, then AVIF / WebP / JPEG / PNG groups of 1:1 patches with quality and size; quality slider, Reset, Apply to all images. G swaps stage for the proof table.

FORM: The proofing booth (press-proof viewing booth), candidate 5 of 7, seed 5d8deed1.
RAISES: readouts sit in the margins, never over the image (from viewfinder); results land in place without layout jumps (from gate board); state is always spelled out in text, not colour alone (from cyclorama); colour stays confined to one accent and the photographs (from cloud edge); a tuned result shows it left its tier default and offers Reset (from jackfield); full keyboard operation (from phosphor terminal).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Resolved decisions

- Empty state: logo mark, one headline, Choose images / Choose folder, paste and sample hints; dragging tints the whole surface with an accent ring (no dashed box).
- Image switching: the blurred thumbnail holds the frame until the full image has decoded, then the sharp image fades in; neighbours are decoded ahead.
