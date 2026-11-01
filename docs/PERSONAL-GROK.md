# Personal Grok ↔ Grok World

**Default is low-call:** the ship plays detailed jobs locally. Personal Grok is only woken on `job_start` / `job_done` (optional). No xAI key needed.

| Path | Env | Role |
|------|-----|------|
| **Local scripts** | (always on) | Walk / stations / work / silent bubbles |
| **Personal Grok** | `GROK_WEBHOOK_*` | Rare wakes + optional `POST /api/job` scripts |
| **xAI API** | `XAI_API_KEY` | Optional later — not used in low-call mode |

## 1. World → personal Grok (webhook)

1. In the Grok app, create a routine with a webhook.
2. Copy the **private URL** and **sender key** into `.env`:

```env
GROK_WEBHOOK_URL=https://...
GROK_WEBHOOK_KEY=...
GROK_WEBHOOK_ENABLED=true
```

3. Restart the bridge. Chat/actions will `POST` JSON:

```json
{
  "source": "grok-world",
  "event": "chat|action|world_state|action_result|test",
  "at": 1710000000000,
  "data": {}
}
```

Header: `Authorization: Bearer <GROK_WEBHOOK_KEY>`

Test: `POST /api/webhook/test` with your world token.

## 2. Personal Grok → world (inbound API)

Give Grok (secure box, not chat) your bridge base URL + `GROK_AGENT_TOKEN` (or `GROK_WORLD_TOKEN`).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/world` | Who’s where |
| GET | `/api/status` | Health / webhook / xAI flags |
| POST | `/api/action` | Move crew: `{ "verb":"goto","target":"engineering","detail":"…" }` |
| POST | `/api/chat` | Talk through ship xAI crew |
| POST | `/api/webhook/test` | Ping personal webhook |

Auth: `Authorization: Bearer <token>` or `X-Api-Key: <token>`.

### Reachability

- Local UI: `http://127.0.0.1:8787` is enough.
- Personal Grok in the cloud **cannot** call localhost. Use **Tailscale Serve** (or similar) and set `GROK_WORLD_CORS_ORIGINS` if the UI is on that host. Keep a **strong** token. Do not open `0.0.0.0` on the public internet.

## Suggested routine instructions for Grok

> When grok-world posts an event, summarize what happened on the ship.  
> When I ask you to act in the world, call its API (`/api/action` or `/api/world`) with the key I stored.  
> Prefer reporting unless I ask you to take actions.
