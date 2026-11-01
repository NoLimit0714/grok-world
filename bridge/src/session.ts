export interface ChatTurnLike {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ActionResult {
  type?: "action_result";
  id: string;
  ok: boolean;
  note?: string;
}

export class SessionStore {
  private map = new Map<string, ChatTurnLike[]>();

  get(sessionId: string): ChatTurnLike[] {
    return this.map.get(sessionId) || [];
  }

  append(sessionId: string, turn: ChatTurnLike) {
    const list = this.get(sessionId);
    list.push(turn);
    this.map.set(sessionId, list.slice(-40));
  }
}
