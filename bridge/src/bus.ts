import type { WebSocket } from "ws";
import type { BusEvent } from "./types.js";

export class EventBus {
  private clients = new Set<WebSocket>();
  private recent: BusEvent[] = [];
  private maxRecent = 200;

  add(ws: WebSocket) {
    this.clients.add(ws);
    for (const ev of this.recent) {
      safeSend(ws, ev);
    }
  }

  remove(ws: WebSocket) {
    this.clients.delete(ws);
  }

  publish(event: BusEvent) {
    this.recent.push(event);
    if (this.recent.length > this.maxRecent) {
      this.recent = this.recent.slice(-this.maxRecent);
    }
    for (const ws of this.clients) {
      safeSend(ws, event);
    }
  }

  getRecent() {
    return [...this.recent];
  }
}

function safeSend(ws: WebSocket, event: BusEvent) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(event));
  }
}
