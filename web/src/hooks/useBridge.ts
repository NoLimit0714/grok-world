import { useCallback, useEffect, useRef, useState } from "react";
import { bridgeWsUrl } from "../lib/config";
import { fetchStatus, fetchWorld, sendChat } from "../lib/api";
import type {
  AgentState,
  BusEvent,
  ChatLine,
  JobEvent,
  RoomState,
  StationState,
  StatusEvent,
  WorldAction,
} from "../lib/types";

export function useBridge() {
  const [connected, setConnected] = useState(false);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [rooms, setRooms] = useState<RoomState[]>([]);
  const [stations, setStations] = useState<StationState[]>([]);
  const [status, setStatus] = useState<StatusEvent | null>(null);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [actions, setActions] = useState<WorldAction[]>([]);
  const [jobs, setJobs] = useState<JobEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const applyEvent = useCallback((ev: BusEvent) => {
    if (ev.type === "world_state") {
      setAgents(ev.agents);
      setRooms(ev.rooms);
      if (ev.stations) setStations(ev.stations);
    } else if (ev.type === "status") {
      setStatus(ev);
    } else if (ev.type === "chat") {
      setChat((prev) => [...prev, { role: ev.role, content: ev.content, at: ev.at }]);
    } else if (ev.type === "action") {
      setActions((prev) => [...prev.slice(-40), ev]);
    } else if (ev.type === "job") {
      setJobs((prev) => [...prev.slice(-20), ev]);
    }
  }, []);

  useEffect(() => {
    let closed = false;
    let retry: number | undefined;

    async function bootstrap() {
      try {
        const [w, s] = await Promise.all([fetchWorld(), fetchStatus()]);
        if (closed) return;
        setAgents(w.agents);
        setRooms(w.rooms);
        if (w.stations) setStations(w.stations);
        setStatus({ type: "status", ...s, at: s.at ?? Date.now() });
        setError(null);
      } catch (e) {
        if (!closed) setError(e instanceof Error ? e.message : String(e));
      }
    }

    function connect() {
      const ws = new WebSocket(bridgeWsUrl());
      wsRef.current = ws;
      ws.onopen = () => {
        setConnected(true);
        setError(null);
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = window.setTimeout(connect, 2000);
      };
      ws.onerror = () => setConnected(false);
      ws.onmessage = (msg) => {
        try {
          applyEvent(JSON.parse(String(msg.data)) as BusEvent);
        } catch {
          /* ignore */
        }
      };
    }

    void bootstrap();
    connect();

    return () => {
      closed = true;
      if (retry) window.clearTimeout(retry);
      wsRef.current?.close();
    };
  }, [applyEvent]);

  const chatSend = useCallback(async (message: string) => {
    setBusy(true);
    setError(null);
    try {
      await sendChat(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    connected,
    agents,
    rooms,
    stations,
    status,
    chat,
    actions,
    jobs,
    busy,
    error,
    chatSend,
  };
}
