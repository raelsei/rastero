declare const __SOURCE_URL__: string

/** The repository this build was made from (package.json `repository`), so a fork links to itself. */
export const SOURCE_URL = __SOURCE_URL__

/** Rastero's GPL notice and the licenses of everything bundled into this build (emitted at build time). */
export const LICENSES_URL = `${import.meta.env.BASE_URL}licenses.txt`
