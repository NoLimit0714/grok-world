const params = new URLSearchParams(window.location.search);

export const BRIDGE_TOKEN =
  params.get("token") ||
  localStorage.getItem("grok_world_token") ||
  import.meta.env.VITE_GROK_WORLD_TOKEN ||
  "dev-local-token-change-me";

export const BRIDGE_HTTP =
  import.meta.env.VITE_BRIDGE_HTTP || `${window.location.protocol}//${window.location.hostname}:8787`;

export function bridgeWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = import.meta.env.VITE_BRIDGE_WS_HOST || `${window.location.hostname}:8787`;
  return `${proto}//${host}/ws?token=${encodeURIComponent(BRIDGE_TOKEN)}`;
}

if (!localStorage.getItem("grok_world_token")) {
  localStorage.setItem("grok_world_token", BRIDGE_TOKEN);
}
