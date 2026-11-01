export type ActionVerb = "goto" | "inspect" | "work" | "say" | "status" | "idle";

export interface AgentState {
  id: string;
  name: string;
  room: string;
  x: number;
  y: number;
  status: string;
  detail: string;
  color: string;
  bubble?: string | null;
  stationId?: string | null;
  pose?: string;
  rank?: string;
  role?: string;
  department?: string;
  skin?: string;
  hair?: string;
  sprite?: number;
}

export interface RoomState {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StationState {
  id: string;
  label: string;
  room: string;
  x: number;
  y: number;
  kind: string;
}

export interface WorldAction {
  type: "action";
  id: string;
  agent: string;
  verb: ActionVerb;
  target?: string;
  detail?: string;
  at?: number;
}

export interface WebhookStatus {
  configured: boolean;
  enabled: boolean;
  lastOk: boolean | null;
  lastError: string | null;
  lastAt: number | null;
  sent: number;
}

export interface StatusEvent {
  type: "status";
  online: boolean;
  model: string;
  xaiConfigured?: boolean;
  lowCall?: boolean;
  activeJob?: string | null;
  activeJobs?: { agent: string; title: string }[];
  webhook?: WebhookStatus;
  lastError: string | null;
  tokensUsed: number;
  messageCount: number;
  at: number;
}

export interface ChatMessageEvent {
  type: "chat";
  role: "user" | "assistant" | "system";
  content: string;
  sessionId: string;
  at: number;
}

export interface WorldStateEvent {
  type: "world_state";
  agents: AgentState[];
  rooms: RoomState[];
  stations?: StationState[];
  at: number;
}

export interface BubbleEvent {
  type: "bubble";
  agent: string;
  text: string;
  silent: boolean;
  at: number;
}

export interface JobEvent {
  type: "job";
  phase: "queued" | "start" | "done";
  jobId: string;
  title: string;
  command: string;
  at: number;
}

export interface ActionResult {
  type: "action_result";
  id: string;
  ok: boolean;
  note?: string;
}

export type BusEvent =
  | WorldAction
  | ActionResult
  | StatusEvent
  | ChatMessageEvent
  | WorldStateEvent
  | BubbleEvent
  | JobEvent;

export interface ChatLine {
  role: "user" | "assistant" | "system";
  content: string;
  at: number;
}
