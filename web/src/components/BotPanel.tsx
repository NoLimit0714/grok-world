import type { AgentState, StatusEvent, WorldAction } from "../lib/types";
import { CREW_SET, flavorFor } from "../scene/crewRoster";
import { BUILDING_BY_ID, type RoomId } from "../scene/layout";
import { statusRingColor } from "../scene/statusColor";

export function BotPanel(props: {
  agent: AgentState | null;
  agents: AgentState[];
  status: StatusEvent | null;
  actions: WorldAction[];
  connected: boolean;
  error: string | null;
  onSelectAgent: (id: string) => void;
}) {
  const { agent, agents, status, actions, connected, error, onSelectAgent } = props;
  const flavor = agent ? flavorFor(agent.id) : null;

  const jobTitle =
    (agent && status?.activeJobs?.find((j) => j.agent === agent.id)?.title) ||
    agent?.detail ||
    flavor?.tagline ||
    "—";

  const events = agent
    ? actions.filter((a) => a.agent === agent.id).slice(-10).reverse()
    : [];

  const district =
    agent && BUILDING_BY_ID[agent.room as RoomId]
      ? BUILDING_BY_ID[agent.room as RoomId].district
      : null;

  return (
    <aside className="bot-panel">
      <header className="bot-panel-head">
        <div>
          <p className="eyebrow">Island City</p>
          <h1>Grok Crew</h1>
        </div>
        <span className={`link-pill${connected ? " on" : ""}`}>
          {connected ? "live" : "offline"}
        </span>
      </header>

      {error ? <p className="panel-err">{error}</p> : null}

      <section className="crew-strip">
        {agents.map((a) => {
          const f = flavorFor(a.id);
          const on = agent?.id === a.id;
          return (
            <button
              key={a.id}
              type="button"
              className={`crew-chip${on ? " on" : ""}`}
              style={{ ["--chip" as string]: a.color || f.accent }}
              onClick={() => onSelectAgent(a.id)}
              title={f.tagline}
            >
              <span
                className="chip-dot"
                style={{ background: statusRingColor(a.status) }}
              />
              {a.name}
            </button>
          );
        })}
      </section>

      {!agent ? (
        <p className="panel-hint">Select a Grok agent to follow their island tasks.</p>
      ) : (
        <>
          <div className="bot-identity">
            <span
              className="status-dot"
              style={{
                background: statusRingColor(agent.status),
                boxShadow: `0 0 10px ${statusRingColor(agent.status)}`,
              }}
            />
            <div>
              <h2>
                {agent.rank ? `${agent.rank} ` : ""}
                {agent.name}
              </h2>
              <p>
                {agent.role || flavor?.tagline}
                {district ? ` · ${district}` : ""}
              </p>
              <p className="room-line">
                {agent.room}
                {agent.stationId ? ` → ${agent.stationId}` : ""} · {agent.status}
              </p>
            </div>
          </div>

          <section className="panel-block">
            <h3>Current task</h3>
            <p className="job-line">{jobTitle}</p>
            {agent.bubble ? <p className="bubble-line">“{agent.bubble}”</p> : null}
          </section>

          <section className="panel-block">
            <h3>Last 10 events</h3>
            {events.length === 0 ? (
              <p className="panel-hint">Waiting for this agent to take an action…</p>
            ) : (
              <ul className="event-list">
                {events.map((ev) => (
                  <li key={ev.id}>
                    <span className="ev-verb">{ev.verb}</span>
                    <span className="ev-detail">
                      {ev.target ? `${ev.target}` : ""}
                      {ev.detail ? (ev.target ? ` — ${ev.detail}` : ev.detail) : ""}
                      {!ev.target && !ev.detail ? "—" : ""}
                    </span>
                    <time>{ev.at ? new Date(ev.at).toLocaleTimeString() : ""}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {status?.activeJobs && status.activeJobs.length > 0 ? (
        <section className="panel-block">
          <h3>Active jobs</h3>
          <ul className="event-list">
            {status.activeJobs
              .filter((j) => CREW_SET.has(j.agent))
              .map((j) => (
                <li key={`${j.agent}-${j.title}`}>
                  <button type="button" className="ev-verb linkish" onClick={() => onSelectAgent(j.agent)}>
                    {j.agent}
                  </button>
                  <span className="ev-detail">{j.title}</span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
