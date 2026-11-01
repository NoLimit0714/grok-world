# Grok World

Local TNG-inspired ship stage for your AI bots — **separate from Jarvis**.

- **Comm** — talk to ship crew (xAI model or mock)
- **Deck** — avatars you can see working
- **Ops lens** — bridge health + personal Grok webhook status

```
You (rare orders) ──► Bridge plans a job locally (FREE detail)
                         │
                         ├──► Deck plays: walk → station → work → silent bubble → return
                         │
                         └──► optional webhook once: job_start (+ job_done)
                              personal Grok can also POST /api/job with a custom script
```

**Default = low-call.** Fullscreen **top-down** ship rooms (tiles, y-sort, lighting, living props). Turbolift doors + minimap; optional watch pips. Orders stay limited (`get new`, …).

Fan sim only — not affiliated with Paramount.

## Quick start

```powershell
cd D:\AI_Lab\grok-world
.\scripts\ensure-secrets.ps1   # strong local token
# Edit .env: XAI_API_KEY, GROK_WEBHOOK_URL, GROK_WEBHOOK_KEY
.\scripts\start.ps1
```

Open **http://127.0.0.1:5178**  
If the token was rotated, open once with `?token=YOUR_TOKEN` (saved to localStorage).

## Wire both brains

### A) xAI (inside the world)

1. Key from **[https://console.x.ai/](https://console.x.ai/)**
2. `.env` → `XAI_API_KEY=...` (never paste into chat)
3. Restart bridge

### B) Personal Grok (webhook + inbound API)

See **[docs/PERSONAL-GROK.md](docs/PERSONAL-GROK.md)**.

```env
GROK_WEBHOOK_URL=...    # from Grok routine panel
GROK_WEBHOOK_KEY=...    # sender key
GROK_WEBHOOK_ENABLED=true
```

Optional separate inbound token: `GROK_AGENT_TOKEN=...`

## Security

| Control | Behavior |
|---------|----------|
| Bind | `127.0.0.1` by default |
| Tokens | Timing-safe compare; weak token + `0.0.0.0` = refuse start |
| Secrets | `.env` gitignored (+ `.env.*`); use `ensure-secrets.ps1` |
| CORS | Localhost (+ optional `GROK_WORLD_CORS_ORIGINS`) |
| Rate limits | Chat / API throttles |
| `/health` | No secrets |
| Keys | xAI + webhook keys only on the bridge |

## Deck map

| Id | Location |
|----|----------|
| `bridge` | Main Bridge |
| `readyroom` | Ready Room |
| `engineering` | Engineering |
| `sickbay` | Sickbay |
| `tenforward` | Ten Forward |
| `holodeck` | Holodeck |

## Try

- `Report to Engineering and scan the warp core`
- `Meet me in Ten Forward`
