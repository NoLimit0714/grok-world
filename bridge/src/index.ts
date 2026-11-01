import http from "node:http";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { WebSocketServer } from "ws";
import { requireAnyToken, wsTokenOk, type TokenSet } from "./auth.js";
import { EventBus } from "./bus.js";
import { WorldSim } from "./world.js";
import { SessionStore, type ActionResult } from "./session.js";
import { GrokWebhook } from "./webhook.js";
import { assertBindSafe, localCorsOrigin } from "./security.js";
import { createRateLimiter } from "./ratelimit.js";
import { describeJob, normalizeJobPayload, planJobFromCommand } from "./jobs.js";
import { JobRunner } from "./runner.js";
import { startAmbientLife } from "./ambient.js";
import type { ActionVerb, WorldAction } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
dotenv.config({ path: path.join(root, ".env") });

const HOST = process.env.GROK_WORLD_HOST || "127.0.0.1";
const PORT = Number(process.env.GROK_WORLD_PORT || 8787);
const LOCAL_TOKEN = process.env.GROK_WORLD_TOKEN || "dev-local-token-change-me";
const AGENT_TOKEN = process.env.GROK_AGENT_TOKEN || LOCAL_TOKEN;
const ALLOWED_ORIGINS = (process.env.GROK_WORLD_CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const WEBHOOK_URL = process.env.GROK_WEBHOOK_URL || "";
const WEBHOOK_KEY = process.env.GROK_WEBHOOK_KEY || "";
const WEBHOOK_ENABLED =
  (process.env.GROK_WEBHOOK_ENABLED || "true").toLowerCase() !== "false";
/** Notify personal Grok only on job start (and optionally done) — keeps cost low. */
const WEBHOOK_ON_DONE =
  (process.env.GROK_WEBHOOK_ON_DONE || "true").toLowerCase() !== "false";
const LOW_CALL = (process.env.GROK_WORLD_LOW_CALL || "true").toLowerCase() !== "false";

assertBindSafe(HOST, LOCAL_TOKEN);

const tokens: TokenSet = { local: LOCAL_TOKEN, agent: AGENT_TOKEN };
const webhook = new GrokWebhook({
  url: WEBHOOK_URL,
  key: WEBHOOK_KEY,
  enabled: WEBHOOK_ENABLED,
});

const app = express();
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(
  cors({
    origin(origin, cb) {
      cb(null, localCorsOrigin(origin, ALLOWED_ORIGINS));
    },
  })
);
app.use(express.json({ limit: "256kb" }));

const allowChat = createRateLimiter({ windowMs: 60_000, max: 30 });
const allowApi = createRateLimiter({ windowMs: 60_000, max: 300 });

const bus = new EventBus();
const world = new WorldSim();
const sessions = new SessionStore();

let lastError: string | null = null;
let messageCount = 0;

function publishWorld() {
  const snap = world.snapshot();
  bus.publish({
    type: "world_state",
    agents: snap.agents,
    rooms: snap.rooms,
    stations: snap.stations,
    at: Date.now(),
  });
}

function statusPayload() {
  return {
    type: "status" as const,
    online: true,
    model: LOW_CALL ? "local script runner (low-call)" : "legacy",
    xaiConfigured: false,
    lowCall: LOW_CALL,
    activeJob: runner.active?.title || null,
    activeJobs: runner.activeJobs,
    webhook: { ...webhook.state },
    lastError,
    tokensUsed: 0,
    messageCount,
    at: Date.now(),
  };
}

function publishStatus() {
  bus.publish(statusPayload());
}

const runner = new JobRunner(world, bus, publishWorld, (event, data) => {
  if (event === "job_start") {
    void webhook.notify("job_start", data);
    publishStatus();
  } else if (event === "job_done") {
    if (WEBHOOK_ON_DONE) void webhook.notify("job_done", data);
    publishStatus();
  }
});

function clientKey(req: express.Request) {
  return req.ip || req.socket.remoteAddress || "local";
}

function startCommand(command: string, sessionId: string) {
  const home = world.ensureAgent("grok").room || "bridge";
  const job = planJobFromCommand(command, "grok", home);
  const reply = `Aye — ${describeJob(job)}\nWatch the deck; silent bubbles show progress.`;

  bus.publish({
    type: "chat",
    role: "user",
    content: command,
    sessionId,
    at: Date.now(),
  });
  bus.publish({
    type: "chat",
    role: "assistant",
    content: reply,
    sessionId,
    at: Date.now(),
  });

  sessions.append(sessionId, { role: "user", content: command });
  sessions.append(sessionId, { role: "assistant", content: reply });
  messageCount += 1;
  lastError = null;

  runner.enqueue(job);
  publishStatus();
  return { job, reply };
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "grok-world",
    bind: `${HOST}:${PORT}`,
    lowCall: LOW_CALL,
  });
});

app.use("/api", (req, res, next) => {
  if (!allowApi(`${clientKey(req)}:api`)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }
  next();
});

app.use("/api", requireAnyToken(tokens));

app.get("/api/world", (_req, res) => {
  res.json(world.snapshot());
});

app.get("/api/events", (_req, res) => {
  res.json({ events: bus.getRecent() });
});

app.get("/api/status", (_req, res) => {
  res.json(statusPayload());
});

/** Limited command → local detailed script (cheap). */
app.post("/api/command", (req, res) => {
  if (!allowChat(`${clientKey(req)}:cmd`)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }
  const sessionId = String(req.body?.sessionId || "main");
  const message = String(req.body?.message || req.body?.command || "").trim();
  if (!message) {
    res.status(400).json({ error: "message required" });
    return;
  }
  const { job, reply } = startCommand(message, sessionId);
  res.json({
    sessionId,
    reply,
    job,
    world: world.snapshot(),
    mode: "low-call",
  });
});

/** Personal Grok can push a custom script (still plays locally). */
app.post("/api/job", (req, res) => {
  const job = normalizeJobPayload(req.body, String(req.body?.command || "custom"));
  if (!job) {
    res.status(400).json({
      error: "invalid_job",
      hint: "Send { title, steps:[{ kind, target?, text?, ms? }] }",
    });
    return;
  }
  runner.enqueue(job, { priority: Boolean(req.body?.priority) });
  bus.publish({
    type: "chat",
    role: "system",
    content: `Queued from agent: ${job.title}`,
    sessionId: "main",
    at: Date.now(),
  });
  publishStatus();
  res.json({ ok: true, job, world: world.snapshot() });
});

/** Comm panel uses the same low-call path (no xAI). */
app.post("/api/chat", (req, res) => {
  if (!allowChat(`${clientKey(req)}:chat`)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }
  const sessionId = String(req.body?.sessionId || "main");
  const message = String(req.body?.message || "").trim();
  if (!message) {
    res.status(400).json({ error: "message required" });
    return;
  }
  const { job, reply } = startCommand(message, sessionId);
  res.json({
    sessionId,
    reply,
    job,
    actions: [],
    world: world.snapshot(),
    mode: "low-call",
  });
});

app.post("/api/action", (req, res) => {
  const verb = String(req.body?.verb || "").toLowerCase() as ActionVerb;
  const allowed: ActionVerb[] = ["goto", "inspect", "work", "say", "status", "idle"];
  if (!allowed.includes(verb)) {
    res.status(400).json({ error: "verb must be goto|inspect|work|say|status|idle" });
    return;
  }
  const agent = String(req.body?.agent || "grok");
  const action: WorldAction = {
    type: "action",
    id: randomUUID(),
    agent,
    verb,
    target: req.body?.target ? String(req.body.target) : undefined,
    detail: req.body?.detail ? String(req.body.detail) : undefined,
    at: Date.now(),
  };
  world.applyAction(action);
  bus.publish(action);
  publishWorld();
  res.json({ ok: true, action, world: world.snapshot() });
});

app.post("/api/action_result", (req, res) => {
  const body = req.body as ActionResult;
  if (!body?.id) {
    res.status(400).json({ error: "id required" });
    return;
  }
  bus.publish({
    type: "action_result",
    id: body.id,
    ok: Boolean(body.ok),
    note: body.note,
  });
  res.json({ ok: true });
});

app.post("/api/webhook/test", async (_req, res) => {
  if (!webhook.state.configured) {
    res.status(400).json({
      error: "webhook_not_configured",
      hint: "Set GROK_WEBHOOK_URL and GROK_WEBHOOK_KEY in .env",
    });
    return;
  }
  const ok = await webhook.notify("test", {
    message: "Grok World bridge test ping",
    world: world.snapshot(),
  });
  publishStatus();
  res.status(ok ? 200 : 502).json({ ok, webhook: webhook.state });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", `http://${HOST}`);
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }
  if (!wsTokenOk(req, tokens)) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws) => {
  bus.add(ws);
  publishWorld();
  publishStatus();
  ws.on("close", () => bus.remove(ws));
});

server.listen(PORT, HOST, () => {
  console.log(`[grok-world bridge] http://${HOST}:${PORT}`);
  console.log(`[grok-world bridge] mode: LOW-CALL script runner (no xAI required)`);
  console.log(
    `[grok-world bridge] personal webhook: ${
      webhook.state.enabled ? "job_start" + (WEBHOOK_ON_DONE ? "+job_done" : "") : "off"
    }`
  );
  startAmbientLife(world, runner);
  publishStatus();
  publishWorld();
});
