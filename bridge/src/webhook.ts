export type WebhookConfig = {
  url: string;
  key: string;
  enabled: boolean;
};

export type WebhookState = {
  configured: boolean;
  enabled: boolean;
  lastOk: boolean | null;
  lastError: string | null;
  lastAt: number | null;
  sent: number;
};

export class GrokWebhook {
  state: WebhookState = {
    configured: false,
    enabled: false,
    lastOk: null,
    lastError: null,
    lastAt: null,
    sent: 0,
  };

  constructor(private cfg: WebhookConfig) {
    this.state.configured = Boolean(cfg.url && cfg.key);
    this.state.enabled = cfg.enabled && this.state.configured;
  }

  async notify(event: string, data: unknown): Promise<boolean> {
    if (!this.state.enabled) return false;

    const body = {
      source: "grok-world",
      event,
      at: Date.now(),
      data,
    };

    try {
      const res = await fetch(this.cfg.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.cfg.key}`,
          "X-Grok-World-Event": event,
        },
        body: JSON.stringify(body),
      });

      this.state.lastAt = Date.now();
      this.state.sent += 1;

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        this.state.lastOk = false;
        this.state.lastError = `webhook ${res.status}: ${text.slice(0, 200)}`;
        return false;
      }

      this.state.lastOk = true;
      this.state.lastError = null;
      return true;
    } catch (err) {
      this.state.lastAt = Date.now();
      this.state.lastOk = false;
      this.state.lastError = err instanceof Error ? err.message : String(err);
      return false;
    }
  }
}
