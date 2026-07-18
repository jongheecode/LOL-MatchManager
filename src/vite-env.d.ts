/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_REGION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
