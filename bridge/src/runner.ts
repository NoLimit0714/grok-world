import type { EventBus } from "./bus.js";
import type { JobScript, JobStep } from "./jobs.js";
import { getStation } from "./stations.js";
import type { WorldSim } from "./world.js";
import type { BusEvent } from "./types.js";

type Notify = (event: string, data: unknown) => void;

type AgentLane = {
  queue: JobScript[];
  current: JobScript | null;
  stepIndex: number;
  timer: ReturnType<typeof setTimeout> | null;
  moveTimer: ReturnType<typeof setInterval> | null;
  busy: boolean;
};

/** Parallel per-agent job lanes so crew can work in different rooms at once. */
export class JobRunner {
  private lanes = new Map<string, AgentLane>();

  constructor(
    private world: WorldSim,
    private bus: EventBus,
    private publishWorld: () => void,
    private notify: Notify
  ) {}

  get activeJobs(): { agent: string; title: string }[] {
    const out: { agent: string; title: string }[] = [];
    for (const [agent, lane] of this.lanes) {
      if (lane.current) out.push({ agent, title: lane.current.title });
    }
    return out;
  }

  get active() {
    const jobs = this.activeJobs;
    return jobs[0] ? { title: jobs.map((j) => j.title).join(" · ") } : null;
  }

  private lane(agentId: string): AgentLane {
    let l = this.lanes.get(agentId);
    if (!l) {
      l = { queue: [], current: null, stepIndex: 0, timer: null, moveTimer: null, busy: false };
      this.lanes.set(agentId, l);
    }
    return l;
  }

  enqueue(job: JobScript, opts?: { priority?: boolean }) {
    const l = this.lane(job.agent);
    if (opts?.priority) l.queue.unshift(job);
    else l.queue.push(job);
    this.bus.publish({
      type: "job",
      phase: "queued",
      jobId: job.id,
      title: job.title,
      command: job.command,
      at: Date.now(),
    } as BusEvent);
    this.kick(job.agent);
  }

  private kick(agentId: string) {
    const l = this.lane(agentId);
    if (l.busy) return;
    const next = l.queue.shift();
    if (!next) return;
    l.busy = true;
    l.current = next;
    l.stepIndex = 0;
    this.bus.publish({
      type: "job",
      phase: "start",
      jobId: next.id,
      title: `${next.agent}: ${next.title}`,
      command: next.command,
      at: Date.now(),
    } as BusEvent);
    this.notify("job_start", { job: next, world: this.world.snapshot() });
    this.runStep(agentId);
  }

  private finish(agentId: string) {
    const l = this.lane(agentId);
    const done = l.current;
    this.clearMove(agentId);
    if (l.timer) clearTimeout(l.timer);
    l.timer = null;
    l.current = null;
    l.stepIndex = 0;
    l.busy = false;
    if (done) {
      this.bus.publish({
        type: "job",
        phase: "done",
        jobId: done.id,
        title: `${done.agent}: ${done.title}`,
        command: done.command,
        at: Date.now(),
      } as BusEvent);
      this.notify("job_done", {
        jobId: done.id,
        title: done.title,
        command: done.command,
        agent: done.agent,
        world: this.world.snapshot(),
      });
    }
    this.publishWorld();
    this.kick(agentId);
  }

  private runStep(agentId: string) {
    const l = this.lane(agentId);
    if (!l.current) return;
    if (l.stepIndex >= l.current.steps.length) {
      this.finish(agentId);
      return;
    }
    const step = l.current.steps[l.stepIndex];
    l.stepIndex += 1;
    void this.execute(agentId, step);
  }

  private async execute(agentId: string, step: JobStep) {
    const agent = this.world.ensureAgent(agentId);

    switch (step.kind) {
      case "turbolift": {
        const dest = step.target || "bridge";
        agent.status = "turbolift";
        agent.detail = `Turbolift → ${dest}`;
        agent.bubble = step.text || `Deck transfer…`;
        agent.pose = "lift";
        agent.stationId = null;
        this.publishWorld();
        await this.delay(agentId, step.ms ?? 1600);
        agent.bubble = null;
        const room = this.world.rooms.find((r) => r.id === dest);
        const door = room
          ? { x: room.x + 24, y: room.y + room.h - 20 }
          : { x: agent.x, y: agent.y };
        agent.x = door.x;
        agent.y = door.y;
        agent.room = dest;
        agent.status = "walking";
        agent.detail = `Arrived · ${room?.label || dest}`;
        agent.pose = "stand";
        this.publishWorld();
        await this.delay(agentId, 400);
        this.runStep(agentId);
        return;
      }
      case "goto_station": {
        const st = getStation(step.target || "");
        if (!st) {
          await this.delay(agentId, 200);
          this.runStep(agentId);
          return;
        }
        if (agent.room !== st.room) {
          // Auto turbolift if crossing decks/rooms
          agent.status = "turbolift";
          agent.detail = `Turbolift → ${st.room}`;
          agent.bubble = "Turbolift…";
          agent.pose = "lift";
          this.publishWorld();
          await this.delay(agentId, 1400);
          agent.bubble = null;
          agent.x = st.x - 30;
          agent.y = st.y;
          agent.room = st.room;
        }
        agent.status = "walking";
        agent.detail = `→ ${st.label}`;
        agent.stationId = st.id;
        agent.bubble = null;
        agent.pose = "walk";
        this.publishWorld();
        await this.walkTo(agentId, st.x, st.y, st.room);
        agent.status = "at_station";
        agent.detail = st.label;
        agent.room = st.room;
        agent.pose = "stand";
        this.publishWorld();
        await this.delay(agentId, 300);
        this.runStep(agentId);
        return;
      }
      case "goto_room": {
        const roomId = step.target || "bridge";
        if (agent.room !== roomId) {
          agent.status = "turbolift";
          agent.detail = `Turbolift → ${roomId}`;
          agent.bubble = "Turbolift…";
          agent.pose = "lift";
          agent.stationId = null;
          this.publishWorld();
          await this.delay(agentId, step.ms ?? 1500);
          agent.bubble = null;
        }
        const room = this.world.rooms.find((r) => r.id === roomId);
        const x = room ? room.x + room.w / 2 : agent.x;
        const y = room ? room.y + room.h / 2 + 10 : agent.y;
        agent.status = "walking";
        agent.detail = `→ ${room?.label || roomId}`;
        agent.pose = "walk";
        this.publishWorld();
        await this.walkTo(agentId, x, y, roomId);
        agent.status = "idle";
        agent.detail = step.text || "On station";
        agent.room = roomId;
        agent.pose = "stand";
        this.publishWorld();
        await this.delay(agentId, 300);
        this.runStep(agentId);
        return;
      }
      case "work": {
        agent.status = "working";
        agent.detail = step.text || "Working…";
        agent.pose = "work";
        agent.bubble = null;
        this.publishWorld();
        this.bus.publish({
          type: "action",
          id: `${Date.now()}-work`,
          agent: agentId,
          verb: "work",
          detail: step.text,
          at: Date.now(),
        });
        await this.delay(agentId, step.ms ?? 4000);
        this.runStep(agentId);
        return;
      }
      case "bubble": {
        agent.bubble = step.text || "";
        agent.status = "update";
        agent.detail = step.text || "";
        agent.pose = "talk";
        this.publishWorld();
        this.bus.publish({
          type: "bubble",
          agent: agentId,
          text: step.text || "",
          silent: true,
          at: Date.now(),
        } as BusEvent);
        await this.delay(agentId, step.ms ?? 2200);
        agent.bubble = null;
        agent.pose = "stand";
        this.publishWorld();
        this.runStep(agentId);
        return;
      }
      case "emote": {
        agent.pose = "emote";
        agent.detail = step.text || "…";
        this.publishWorld();
        await this.delay(agentId, step.ms ?? 700);
        this.runStep(agentId);
        return;
      }
      case "wait": {
        await this.delay(agentId, step.ms ?? 1000);
        this.runStep(agentId);
        return;
      }
      case "idle":
      default: {
        agent.status = "idle";
        agent.detail = step.text || "On standby";
        agent.pose = "stand";
        agent.bubble = null;
        this.publishWorld();
        await this.delay(agentId, 400);
        this.runStep(agentId);
      }
    }
  }

  private walkTo(agentId: string, tx: number, ty: number, room: string): Promise<void> {
    return new Promise((resolve) => {
      this.clearMove(agentId);
      const l = this.lane(agentId);
      const speed = 3.2;
      let tick = 0;
      l.moveTimer = setInterval(() => {
        const a = this.world.ensureAgent(agentId);
        const dx = tx - a.x;
        const dy = ty - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist < speed + 0.5) {
          a.x = tx;
          a.y = ty;
          a.room = room;
          this.clearMove(agentId);
          this.publishWorld();
          resolve();
          return;
        }
        a.x += (dx / dist) * speed;
        a.y += (dy / dist) * speed;
        a.room = room;
        tick += 1;
        if (tick % 2 === 0) this.publishWorld();
      }, 50);
    });
  }

  private delay(agentId: string, ms: number) {
    const l = this.lane(agentId);
    return new Promise<void>((resolve) => {
      if (l.timer) clearTimeout(l.timer);
      l.timer = setTimeout(() => resolve(), ms);
    });
  }

  private clearMove(agentId: string) {
    const l = this.lane(agentId);
    if (l.moveTimer) {
      clearInterval(l.moveTimer);
      l.moveTimer = null;
    }
  }
}
