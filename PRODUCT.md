# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + TypeScript, Bun as package manager, script runner and test runner. Image codecs are WebAssembly (jSquash: MozJPEG, libwebp, libavif, OxiPNG, libjxl; libimagequant; libheif for HEIC input) running in a Web Worker pool. Deployed as a static site on GitHub Pages at https://koray.dev/rastero/ (relative asset base, CSP as a meta tag). License: MIT.

## Users

Primarily developers and site owners deciding which image format and quality to ship (web pages, CDNs, thumbnails at scale), where every byte counts. Designers and content creators are a secondary audience who want a smaller file fast and judge by eye. Sessions range from inspecting a handful of images closely to running a whole folder of hundreds.

## Product Purpose

Rastero compresses images entirely in the browser. Drop or pick images or whole folders; every image is encoded in all enabled formats at several quality tiers at once, so the size and savings of each option are visible side by side. The user downloads any single result, or exports a chosen result per image as a ZIP that keeps the folder structure, or writes straight into a folder where the browser allows it. Success: the user knows which format/quality to ship and leaves with the files, without uploading anything.

## Positioning

Other browser compressors make you pick one output format first (Squoosh: one image; Squish, Pic Smaller: one format per batch). Rastero answers the question before it is asked: every format and tier per image, measured, in one view, with the real encoded pixels to judge. It grew from a hand-made comparison page (PNG vs JPEG q80 vs AVIF crf 24/28/32/38 across 19 real CDN thumbnails) and turns that into a tool.

## Operating Context

- Desktop browser first; folder selection (`webkitdirectory`), folder drag-and-drop (`webkitGetAsEntry`) work on all desktop browsers; saving into a folder (`showDirectoryPicker`) is Chromium-only, elsewhere ZIP.
- Everything runs locally; files never leave the device. Works on any static host (no cross-origin isolation required).
- Encoding cost is real: a 12 MP photo takes ~0.7 s (JPEG/WebP) to ~4 s (AVIF) and ~8 s (JPEG XL) per variant on one core, so results stream in progressively.

## Capabilities and Constraints

- Input: JPEG, PNG, WebP, AVIF, GIF (first frame), BMP, HEIC/HEIF (native on Safari, libheif WASM elsewhere, loaded only when needed), JPEG XL.
- Output formats: AVIF, WebP, JPEG (MozJPEG), PNG lossy (quantized), PNG lossless (OxiPNG) enabled by default; JPEG XL available but off by default (slow encode, browser display support still rolling out).
- Quality model: each lossy format is computed at three tiers (high / balanced / small); the selected result can be fine-tuned with a quality slider.
- No resizing in the first release.
- Metadata (EXIF, GPS) is not carried over into outputs.
- UI language: English.

## Brand Commitments

- Name: Rastero.
- Dark interface.
- Reference for tone and craft: Photoroom: simple, focused, high quality.
- Must not feel like: a settings-heavy pro tool, a toy (emoji, cute illustration, loud color), a marketing page (hero, slogans, CTAs; the app opens straight into work), or a showcase of effects (waiting transitions, glow, glass).

## Evidence on Hand

- `~/Desktop/thumb-compare/`: the origin comparison page and 19 real 200 px CDN thumbnails with PNG/JPEG/AVIF variants.
- Measured single-thread encode costs recorded in Operating Context (Apple Silicon, jSquash).
- No users, testimonials, or usage statistics exist; none may be invented.

## Product Principles

1. Show the answer, not the settings: every option is already computed and measured when the user looks.
2. The pixels are the proof: size numbers always sit next to the real encoded image, never alone.
3. Private by construction: nothing leaves the device, nothing needs an account or a server.
4. One image or a thousand: the same flow handles close inspection and folder-scale batches.
5. Quiet until needed: controls appear where the decision is made, not up front.
