import { randomUUID } from "node:crypto";
import type { JobRunner } from "./runner.js";
import type { JobScript } from "./jobs.js";
import type { WorldSim } from "./world.js";

/** Quiet background life so other rooms stay “alive” without extra Grok calls. */
export function startAmbientLife(world: WorldSim, runner: JobRunner) {
  const tick = () => {
    const idle = world.snapshot().agents.filter((a) => a.status === "idle");
    const candidates = idle.filter((a) => a.id !== "grok" || Math.random() > 0.7);
    if (!candidates.length) return;
    const a = candidates[Math.floor(Math.random() * candidates.length)];
    if (runner.activeJobs.some((j) => j.agent === a.id)) return;

    const job = pickAmbient(a.id, a.room);
    if (job) runner.enqueue(job);
  };

  // Stagger first waves
  setTimeout(tick, 8000);
  setInterval(tick, 28000);
}

function pickAmbient(agentId: string, room: string): JobScript | null {
  const roll = Math.random();
  if (agentId === "ce" || (agentId === "grok" && roll > 0.5)) {
    return {
      id: randomUUID(),
      agent: agentId,
      title: "Routine engineering pass",
      command: "ambient",
      homeRoom: room,
      steps: [
        { kind: "turbolift", target: "engineering", ms: 1400 },
        { kind: "goto_station", target: "eng_core" },
        { kind: "work", text: "Core readings…", ms: 3200 },
        { kind: "bubble", text: "Nominal.", ms: 1600 },
        { kind: "turbolift", target: room === "engineering" ? "bridge" : room, ms: 1400 },
        { kind: "idle", text: "On standby" },
      ],
    };
  }
  if (agentId === "cmo") {
    return {
      id: randomUUID(),
      agent: agentId,
      title: "Sickbay rounds",
      command: "ambient",
      homeRoom: "sickbay",
      steps: [
        { kind: "goto_station", target: "sick_biobed" },
        { kind: "work", text: "Bay check…", ms: 2800 },
        { kind: "bubble", text: "All quiet.", ms: 1500 },
        { kind: "idle", text: "In Sickbay" },
      ],
    };
  }
  if (agentId === "cns") {
    return {
      id: randomUUID(),
      agent: agentId,
      title: "Ten Forward presence",
      command: "ambient",
      homeRoom: "tenforward",
      steps: [
        { kind: "goto_station", target: "tf_bar" },
        { kind: "bubble", text: "Crew morale steady.", ms: 2000 },
        { kind: "idle", text: "In Ten Forward" },
      ],
    };
  }
  if (agentId === "sci" || agentId === "xo") {
    return {
      id: randomUUID(),
      agent: agentId,
      title: "Bridge watch",
      command: "ambient",
      homeRoom: "bridge",
      steps: [
        { kind: "goto_station", target: roll > 0.5 ? "bridge_tactical" : "bridge_ops" },
        { kind: "work", text: "Monitoring…", ms: 3000 },
        { kind: "idle", text: "On the Bridge" },
      ],
    };
  }
  if (agentId === "co") {
    return {
      id: randomUUID(),
      agent: agentId,
      title: "Ready Room",
      command: "ambient",
      homeRoom: "bridge",
      steps: [
        { kind: "turbolift", target: "readyroom", ms: 1200 },
        { kind: "goto_station", target: "ready_desk" },
        { kind: "work", text: "Reviewing logs…", ms: 3500 },
        { kind: "turbolift", target: "bridge", ms: 1200 },
        { kind: "idle", text: "On the Bridge" },
      ],
    };
  }
  return null;
}
