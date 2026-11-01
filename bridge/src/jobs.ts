import { randomUUID } from "node:crypto";
import { resolveStation, type Station } from "./stations.js";

export type JobStepKind =
  | "goto_station"
  | "goto_room"
  | "turbolift"
  | "work"
  | "bubble"
  | "emote"
  | "wait"
  | "idle";

export interface JobStep {
  kind: JobStepKind;
  /** station id or room id depending on kind */
  target?: string;
  text?: string;
  /** milliseconds for work/wait/bubble display */
  ms?: number;
}

export interface JobScript {
  id: string;
  agent: string;
  title: string;
  command: string;
  steps: JobStep[];
  /** home room to return to if not specified in steps */
  homeRoom?: string;
}

export function planJobFromCommand(command: string, agent = "grok", homeRoom = "bridge"): JobScript {
  const c = command.toLowerCase().trim();
  const id = randomUUID();

  if (matches(c, ["get new", "get news", "new task", "new jobs", "fetch new", "check inbox", "inbox"])) {
    return script(id, agent, command, "Fetch new assignments", homeRoom, [
      { kind: "bubble", text: "New task received — Ops console.", ms: 1600 },
      { kind: "goto_station", target: "bridge_ops" },
      { kind: "emote", text: "logging in", ms: 600 },
      { kind: "work", text: "Pulling mission queue…", ms: 3800 },
      { kind: "bubble", text: "Three items flagged. Primary: Engineering.", ms: 2400 },
      { kind: "turbolift", target: "engineering", text: "Turbolift to Main Engineering", ms: 1800 },
      { kind: "goto_station", target: "eng_diag" },
      { kind: "work", text: "Running diagnostic sweep…", ms: 4500 },
      { kind: "bubble", text: "Diagnostics clear.", ms: 2200 },
      { kind: "turbolift", target: homeRoom, text: "Returning via turbolift", ms: 1600 },
      { kind: "idle", text: "Back on standby." },
    ]);
  }

  if (matches(c, ["scan", "sensor", "long range", "tactical"])) {
    return script(id, agent, command, "Sensor / tactical sweep", homeRoom, [
      { kind: "bubble", text: "Aye — moving to Tactical.", ms: 1500 },
      { kind: "goto_station", target: "bridge_tactical" },
      { kind: "work", text: "Sweeping sensor grid…", ms: 4500 },
      { kind: "bubble", text: "No anomalies in local space.", ms: 2400 },
      { kind: "goto_room", target: homeRoom },
      { kind: "idle", text: "Tactical quiet. Standing by." },
    ]);
  }

  if (matches(c, ["engineer", "warp", "core", "repair", "fix"])) {
    return script(id, agent, command, "Engineering detail", homeRoom, [
      { kind: "bubble", text: "En route to Main Engineering.", ms: 1600 },
      { kind: "goto_station", target: "eng_core" },
      { kind: "work", text: "Inspecting core telemetry…", ms: 4800 },
      { kind: "bubble", text: "Intermix stable. Minor recalibration…", ms: 2200 },
      { kind: "work", text: "Calibrating…", ms: 3000 },
      { kind: "bubble", text: "Core nominal. Returning.", ms: 2000 },
      { kind: "goto_room", target: homeRoom },
      { kind: "idle", text: "Engineering report filed." },
    ]);
  }

  if (matches(c, ["sick", "med", "health", "biobed"])) {
    return script(id, agent, command, "Sickbay check", homeRoom, [
      { kind: "goto_station", target: "sick_lab" },
      { kind: "work", text: "Reviewing bay status…", ms: 4000 },
      { kind: "bubble", text: "All biobeds idle. Supplies green.", ms: 2400 },
      { kind: "goto_room", target: homeRoom },
      { kind: "idle", text: "Sickbay quiet." },
    ]);
  }

  if (matches(c, ["ten forward", "lounge", "break", "coffee", "drink"])) {
    return script(id, agent, command, "Ten Forward break", homeRoom, [
      { kind: "bubble", text: "Brief pause — Ten Forward.", ms: 1400 },
      { kind: "goto_station", target: "tf_bar" },
      { kind: "work", text: "Recharging…", ms: 3500 },
      { kind: "bubble", text: "Back to it.", ms: 1600 },
      { kind: "goto_room", target: homeRoom },
      { kind: "idle", text: "On station." },
    ]);
  }

  if (matches(c, ["holo", "holodeck", "program", "train"])) {
    return script(id, agent, command, "Holodeck run", homeRoom, [
      { kind: "goto_station", target: "holo_arch" },
      { kind: "work", text: "Loading training grid…", ms: 3000 },
      { kind: "goto_station", target: "holo_grid" },
      { kind: "work", text: "Simulation cycle…", ms: 4500 },
      { kind: "bubble", text: "Program complete. Arch secured.", ms: 2200 },
      { kind: "goto_room", target: homeRoom },
      { kind: "idle", text: "Holodeck offline." },
    ]);
  }

  if (matches(c, ["ready room", "brief", "report to captain"])) {
    return script(id, agent, command, "Ready Room brief", homeRoom, [
      { kind: "goto_station", target: "ready_desk" },
      { kind: "work", text: "Preparing brief…", ms: 3500 },
      { kind: "bubble", text: "Brief ready on the desk.", ms: 2200 },
      { kind: "goto_room", target: homeRoom },
      { kind: "idle", text: "Awaiting further orders." },
    ]);
  }

  if (matches(c, ["standby", "stand by", "idle", "wait", "stop"])) {
    return script(id, agent, command, "Stand by", homeRoom, [
      { kind: "bubble", text: "Holding position.", ms: 1500 },
      { kind: "goto_room", target: homeRoom },
      { kind: "idle", text: "On standby." },
    ]);
  }

  // Default rich job: ops computer then return
  return script(id, agent, command, "General ops task", homeRoom, [
    { kind: "bubble", text: `On it: “${trimCmd(command)}”`, ms: 1800 },
    { kind: "goto_station", target: "bridge_ops" },
    { kind: "work", text: "Working the problem…", ms: 4500 },
    { kind: "bubble", text: "Task logged. Wrapping up.", ms: 2400 },
    { kind: "goto_room", target: homeRoom },
    { kind: "idle", text: "Ready for the next order." },
  ]);
}

/** Allow personal Grok to submit a script via API (still one wake on his side). */
export function normalizeJobPayload(body: unknown, fallbackCommand = "custom"): JobScript | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const stepsIn = Array.isArray(b.steps) ? b.steps : null;
  if (!stepsIn || stepsIn.length === 0) return null;

  const steps: JobStep[] = [];
  for (const raw of stepsIn) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    const kind = String(s.kind || s.type || "") as JobStepKind;
    const allowed: JobStepKind[] = [
      "goto_station",
      "goto_room",
      "turbolift",
      "work",
      "bubble",
      "emote",
      "wait",
      "idle",
    ];
    if (!allowed.includes(kind)) continue;
    let target = s.target ? String(s.target) : undefined;
    if (kind === "goto_station" && target) {
      const st = resolveStation(target);
      target = st?.id || target;
    }
    steps.push({
      kind,
      target,
      text: s.text ? String(s.text) : s.detail ? String(s.detail) : undefined,
      ms: typeof s.ms === "number" ? s.ms : undefined,
    });
  }
  if (!steps.length) return null;

  return {
    id: typeof b.id === "string" ? b.id : randomUUID(),
    agent: String(b.agent || "grok"),
    title: String(b.title || "Custom job"),
    command: String(b.command || fallbackCommand),
    steps,
    homeRoom: b.homeRoom ? String(b.homeRoom) : "bridge",
  };
}

function script(
  id: string,
  agent: string,
  command: string,
  title: string,
  homeRoom: string,
  steps: JobStep[]
): JobScript {
  return { id, agent, title, command, homeRoom, steps };
}

function matches(c: string, keys: string[]) {
  return keys.some((k) => c.includes(k));
}

function trimCmd(c: string) {
  return c.length > 42 ? c.slice(0, 40) + "…" : c;
}

export function describeJob(job: JobScript): string {
  const n = job.steps.length;
  return `${job.title} (${n} beats on the deck — local playback, no extra calls).`;
}

export function stationLabel(id: string): string {
  const s = resolveStation(id);
  return s?.label || id;
}

export type { Station };
