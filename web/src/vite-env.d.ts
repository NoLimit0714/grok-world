/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GROK_WORLD_TOKEN?: string;
  readonly VITE_BRIDGE_HTTP?: string;
  readonly VITE_BRIDGE_WS_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
