// Minimal typing for the self-contained libheif wasm ESM bundle (the package ships no .d.mts for it).
declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
  export interface HeifImage {
    get_width(): number
    get_height(): number
    is_primary(): boolean
    has_alpha_channel(): boolean
    /** Fills `target.data` with interleaved RGBA; calls back with the target, or null on failure. */
    display(target: ImageData, callback: (result: ImageData | null) => void): void
    free(): void
  }
  export interface HeifDecoder {
    /** Native heif_context pointer; freed on the next decode() or via heif_context_free. */
    decoder: unknown
    decode(data: Uint8Array): HeifImage[]
  }
  export interface LibHeif {
    HeifDecoder: new () => HeifDecoder
    heif_context_free(context: unknown): void
  }
  const factory: () => LibHeif
  export default factory
}
