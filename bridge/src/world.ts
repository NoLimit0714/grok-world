import { randomUUID } from "node:crypto";
import { CREW, getCrew } from "./crew.js";
import { STATIONS } from "./stations.js";
import type { AgentState, RoomState, WorldAction, ActionVerb } from "./types.js";

/** Galaxy-class style deck map (fan sim — original layout, not official IP). */
const ROOMS: RoomState[] = [
  { id: "bridge", label: "Main Bridge", x: 180, y: 20, w: 240, h: 110 },
  { id: "readyroom", label: "Ready Room", x: 440, y: 20, w: 140, h: 110 },
  { id: "engineering", label: "Engineering", x: 20, y: 150, w: 200, h: 150 },
  { id: "sickbay", label: "Sickbay", x: 240, y: 150, w: 160, h: 150 },
  { id: "tenforward", label: "Ten Forward", x: 420, y: 150, w: 160, h: 150 },
  { id: "holodeck", label: "Holodeck", x: 160, y: 320, w: 280, h: 120 },
];

export const ROOM_IDS = ROOMS.map((r) => r.id);

const ROOM_CENTERS: Record<string, { x: number; y: number }> = Object.fromEntries(
  ROOMS.map((r) => [r.id, { x: r.x + r.w / 2, y: r.y + r.h / 2 }])
);

const ROOM_ALIASES: Record<string, string> = {
  bridge: "bridge",
  "main bridge": "bridge",
  readyroom: "readyroom",
  "ready room": "readyroom",
  engineering: "engineering",
  eng: "engineering",
  sickbay: "sickbay",
  sick: "sickbay",
  medical: "sickbay",
  tenforward: "tenforward",
  "ten forward": "tenforward",
  "ten-forward": "tenforward",
  lounge: "tenforward",
  holodeck: "holodeck",
  holo: "holodeck",
};

export function resolveRoomId(raw?: string): string | null {
  if (!raw) return null;
  const key = raw.toLowerCase().trim();
  if (ROOM_ALIASES[key]) return ROOM_ALIASES[key];
  const compact = key.replace(/[\s_-]+/g, "");
  for (const [alias, id] of Object.entries(ROOM_ALIASES)) {
    if (alias.replace(/[\s_-]+/g, "") === compact) return id;
    if (compact.includes(id)) return id;
  }
  return ROOMS.find((r) => r.id === key || r.label.toLowerCase() === key)?.id || null;
}

function makeAgentFromCrew(id: string, offset = 0): AgentState {
  const def = getCrew(id);
  const room = def?.homeRoom || "bridge";
  const c = ROOM_CENTERS[room] || ROOM_CENTERS.bridge;
  const ox = (offset % 3) * 22 - 22;
  const oy = Math.floor(offset / 3) * 18;
  return {
    id,
    name: def?.name || id,
    room,
    x: c.x + ox,
    y: c.y + oy,
    status: "idle",
    detail: def ? `${def.rank} · ${def.role}` : "On standby",
    color: def?.uniform || "#f5a623",
    bubble: null,
    stationId: null,
    pose: "stand",
    rank: def?.rank,
    role: def?.role,
    department: def?.department,
    skin: def?.skin,
    hair: def?.hair,
    sprite: def?.sprite ?? 0,
  };
}

function seedCrew(): Record<string, AgentState> {
  const agents: Record<string, AgentState> = {};
  CREW.forEach((c, i) => {
    agents[c.id] = makeAgentFromCrew(c.id, i);
  });
  return agents;
}

export class WorldSim {
  rooms = ROOMS;
  stations = STATIONS;
  agents: Record<string, AgentState> = seedCrew();

  snapshot() {
    return {
      agents: Object.values(this.agents),
      rooms: this.rooms,
      stations: this.stations.map((s) => ({
        id: s.id,
        label: s.label,
        room: s.room,
        x: s.x,
        y: s.y,
        kind: s.kind,
      })),
    };
  }

  ensureAgent(id: string, _name?: string) {
    if (!this.agents[id]) {
      this.agents[id] = makeAgentFromCrew(id, Object.keys(this.agents).length);
    }
    return this.agents[id];
  }

  applyAction(action: WorldAction): AgentState {
    const agent = this.ensureAgent(action.agent);
    agent.status = action.verb;
    agent.detail = action.detail || action.target || action.verb;

    if (action.verb === "goto" && action.target) {
      const roomId = resolveRoomId(action.target);
      const room = roomId ? this.rooms.find((r) => r.id === roomId) : null;
      if (room) {
        agent.room = room.id;
        agent.x = room.x + room.w / 2 + (Math.random() * 40 - 20);
        agent.y = room.y + room.h / 2 + (Math.random() * 30 - 15);
        agent.stationId = null;
      }
    }

    if (action.verb === "idle") {
      agent.status = "idle";
      agent.detail = action.detail || "On standby";
      agent.pose = "stand";
      agent.bubble = null;
    }

    return agent;
  }

  createAction(
    agent: string,
    verb: ActionVerb,
    target?: string,
    detail?: string
  ): WorldAction {
    return {
      type: "action",
      id: randomUUID(),
      agent,
      verb,
      target,
      detail,
      at: Date.now(),
    };
  }
}

/** Pull structured actions from model text; also accept JSON block. */
export function parseActionsFromReply(text: string, agent = "grok"): WorldAction[] {
  const actions: WorldAction[] = [];
  const sim = new WorldSim();

  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/i);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      const list = Array.isArray(parsed) ? parsed : parsed.actions || [];
      for (const item of list) {
        const verb = normalizeVerb(item.verb || item.action);
        if (!verb) continue;
        actions.push(
          sim.createAction(item.agent || agent, verb, item.target, item.detail || item.note)
        );
      }
    } catch {
      /* ignore bad json */
    }
  }

  if (actions.length === 0) {
    const lower = text.toLowerCase();
    const roomHints = [
      "ten forward",
      "ten-forward",
      "ready room",
      "bridge",
      "engineering",
      "sickbay",
      "holodeck",
    ];
    for (const hint of roomHints) {
      if (
        lower.includes(hint) &&
        (lower.includes("go") ||
          lower.includes("head") ||
          lower.includes("move") ||
          lower.includes("beam") ||
          lower.includes("report"))
      ) {
        const id = resolveRoomId(hint);
        if (id) {
          actions.push(sim.createAction(agent, "goto", id, `En route to ${hint}`));
          break;
        }
      }
    }
    if (
      lower.includes("inspect") ||
      lower.includes("look") ||
      lower.includes("scan") ||
      lower.includes("check")
    ) {
      actions.push(sim.createAction(agent, "inspect", undefined, "Scanning"));
    } else if (lower.includes("work") || lower.includes("repair") || lower.includes("fix")) {
      actions.push(sim.createAction(agent, "work", undefined, "On task"));
    } else if (actions.length === 0) {
      actions.push(sim.createAction(agent, "say", undefined, text.slice(0, 80)));
    }
  }

  return actions;
}

function normalizeVerb(v: unknown): ActionVerb | null {
  if (typeof v !== "string") return null;
  const x = v.toLowerCase();
  if (["goto", "go", "move", "walk", "beam"].includes(x)) return "goto";
  if (["inspect", "look", "check", "scan"].includes(x)) return "inspect";
  if (["work", "build", "fix", "do", "repair"].includes(x)) return "work";
  if (["say", "speak", "talk"].includes(x)) return "say";
  if (["status", "report"].includes(x)) return "status";
  if (["idle", "wait", "standby"].includes(x)) return "idle";
  return null;
}
