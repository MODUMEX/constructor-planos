/// <reference types="vite/client" />

/** versión del package.json, inyectada por Vite al compilar (ver vite.config.ts) */
declare const __VERSION_APP__: string

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_ERP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
