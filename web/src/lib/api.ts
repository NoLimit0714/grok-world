import { BRIDGE_HTTP, BRIDGE_TOKEN } from "./config";
import type { AgentState, RoomState, StationState, StatusEvent, WorldAction } from "./types";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BRIDGE_HTTP}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BRIDGE_TOKEN}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(body || res.statusText);
  }
  return res.json() as Promise<T>;
}

export function sendChat(message: string, sessionId = "main") {
  return api<{
    reply: string;
    job?: unknown;
    actions: WorldAction[];
    world: { agents: AgentState[]; rooms: RoomState[]; stations?: StationState[] };
    mode?: string;
  }>("/api/chat", {
    method: "POST",
    body: JSON.stringify({ sessionId, message }),
  });
}

export function fetchWorld() {
  return api<{ agents: AgentState[]; rooms: RoomState[]; stations?: StationState[] }>("/api/world");
}

export function fetchStatus() {
  return api<Omit<StatusEvent, "type">>("/api/status");
}

export function sendAction(body: {
  agent?: string;
  verb: string;
  target?: string;
  detail?: string;
}) {
  return api<{ ok: boolean; action: WorldAction; world: unknown }>("/api/action", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
