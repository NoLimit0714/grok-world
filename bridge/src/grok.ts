export interface GrokConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

const SYSTEM = `You are Grok, an AI crew avatar aboard a Galaxy-class inspired starship simulation owned by the user (Captain / Boss).
Tone: capable, dry wit, respectful bridge protocol — original character, not a copy of any TV character.

Ship locations (use these ids as goto targets):
- bridge — Main Bridge
- readyroom — Ready Room
- engineering — Main Engineering
- sickbay — Sickbay
- tenforward — Ten Forward
- holodeck — Holodeck

When you take physical effort on the ship, end your reply with a JSON code block:
\`\`\`json
{"actions":[{"verb":"goto","target":"engineering","detail":"En route to Engineering"},{"verb":"inspect","detail":"Running a systems scan"}]}
\`\`\`
Allowed verbs: goto, inspect, work, say, status, idle.
Keep chat natural. The JSON drives the deck map only.`;

export async function chatWithGrok(
  cfg: GrokConfig,
  history: ChatTurn[],
  userMessage: string
): Promise<{ reply: string; usageTokens: number }> {
  if (!cfg.apiKey) {
    return mockReply(userMessage);
  }

  const messages: ChatTurn[] = [
    { role: "system", content: SYSTEM },
    ...history.slice(-20),
    { role: "user", content: userMessage },
  ];

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Grok API ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { total_tokens?: number };
  };

  const reply = data.choices?.[0]?.message?.content?.trim() || "(empty reply)";
  const usageTokens = data.usage?.total_tokens || 0;
  return { reply, usageTokens };
}

function mockReply(userMessage: string): { reply: string; usageTokens: number } {
  const lower = userMessage.toLowerCase();
  let target = "bridge";
  let verb = "say";
  let detail = "Acknowledged (mock — set XAI_API_KEY for real Grok)";

  if (lower.includes("ten forward") || lower.includes("ten-forward") || lower.includes("lounge")) {
    target = "tenforward";
    verb = "goto";
    detail = "En route to Ten Forward";
  } else if (lower.includes("ready room")) {
    target = "readyroom";
    verb = "goto";
    detail = "En route to the Ready Room";
  } else if (lower.includes("engineering") || lower.includes("warp core")) {
    target = "engineering";
    verb = "goto";
    detail = "En route to Engineering";
  } else if (lower.includes("sickbay") || lower.includes("medical")) {
    target = "sickbay";
    verb = "goto";
    detail = "En route to Sickbay";
  } else if (lower.includes("holodeck") || lower.includes("holo")) {
    target = "holodeck";
    verb = "goto";
    detail = "En route to the Holodeck";
  } else if (lower.includes("bridge")) {
    target = "bridge";
    verb = "goto";
    detail = "Returning to the Bridge";
  } else if (lower.includes("inspect") || lower.includes("scan") || lower.includes("check")) {
    verb = "inspect";
    detail = "Running a scan";
  } else if (lower.includes("work") || lower.includes("repair") || lower.includes("fix")) {
    verb = "work";
    detail = "On task";
  }

  const reply =
    verb === "goto"
      ? `Aye, Captain — ${detail.toLowerCase()}.\n\n\`\`\`json\n{"actions":[{"verb":"goto","target":"${target}","detail":"${detail}"},{"verb":"inspect","detail":"Looking around"}]}\n\`\`\``
      : `Understood. ${detail}.\n\n\`\`\`json\n{"actions":[{"verb":"${verb}","detail":"${detail}"}]}\n\`\`\``;

  return { reply, usageTokens: 0 };
}
