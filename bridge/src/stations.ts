export interface Station {
  id: string;
  label: string;
  room: string;
  x: number;
  y: number;
  kind: "console" | "terminal" | "panel" | "bar" | "pad";
}

/** Work props on the deck — avatars walk here for jobs (local, free detail). */
export const STATIONS: Station[] = [
  { id: "bridge_ops", label: "Ops Console", room: "bridge", x: 250, y: 70, kind: "console" },
  { id: "bridge_tactical", label: "Tactical", room: "bridge", x: 350, y: 85, kind: "panel" },
  { id: "ready_desk", label: "Ready Desk", room: "readyroom", x: 510, y: 75, kind: "terminal" },
  { id: "eng_core", label: "Core Console", room: "engineering", x: 80, y: 210, kind: "console" },
  { id: "eng_diag", label: "Diagnostics", room: "engineering", x: 160, y: 250, kind: "terminal" },
  { id: "sick_biobed", label: "Biobed Panel", room: "sickbay", x: 280, y: 200, kind: "panel" },
  { id: "sick_lab", label: "Med Lab", room: "sickbay", x: 350, y: 260, kind: "terminal" },
  { id: "tf_bar", label: "Bar Terminal", room: "tenforward", x: 480, y: 200, kind: "bar" },
  { id: "holo_arch", label: "Arch Controls", room: "holodeck", x: 220, y: 360, kind: "pad" },
  { id: "holo_grid", label: "Grid Node", room: "holodeck", x: 380, y: 380, kind: "pad" },
];

export function getStation(id: string): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}

export function resolveStation(raw?: string): Station | undefined {
  if (!raw) return undefined;
  const key = raw.toLowerCase().trim();
  const direct = STATIONS.find((s) => s.id === key || s.label.toLowerCase() === key);
  if (direct) return direct;
  if (key.includes("ops") || key.includes("computer") || key.includes("console")) {
    return getStation("bridge_ops");
  }
  if (key.includes("core") || key.includes("warp") || key.includes("engine")) {
    return getStation("eng_core");
  }
  if (key.includes("diag")) return getStation("eng_diag");
  if (key.includes("sick") || key.includes("med") || key.includes("bio")) {
    return getStation("sick_biobed");
  }
  if (key.includes("bar") || key.includes("ten")) return getStation("tf_bar");
  if (key.includes("holo") || key.includes("arch")) return getStation("holo_arch");
  if (key.includes("tactical")) return getStation("bridge_tactical");
  if (key.includes("ready") || key.includes("desk")) return getStation("ready_desk");
  return undefined;
}
