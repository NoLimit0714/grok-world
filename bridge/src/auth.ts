import type { IncomingMessage } from "node:http";
import type { Request, Response, NextFunction } from "express";
import { safeEqual } from "./security.js";

export type TokenSet = {
  /** Local UI / ship console */
  local: string;
  /** Personal Grok (or other agents) calling into the world */
  agent: string;
};

function extractBearer(req: { header(name: string): string | undefined; query?: Request["query"] }) {
  const header = req.header("authorization") || "";
  const query = typeof req.query?.token === "string" ? req.query.token : "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const apiKey = req.header("x-api-key") || "";
  return bearer || apiKey || query;
}

export function requireAnyToken(tokens: TokenSet) {
  return (req: Request, res: Response, next: NextFunction) => {
    const got = extractBearer(req);
    const ok =
      (tokens.local && safeEqual(got, tokens.local)) ||
      (tokens.agent && safeEqual(got, tokens.agent));
    if (!ok) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    next();
  };
}

export function wsTokenOk(req: IncomingMessage, tokens: TokenSet): boolean {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const q = url.searchParams.get("token") || "";
    const header = req.headers.authorization || "";
    const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
    const apiKey = (req.headers["x-api-key"] as string) || "";
    const proto = req.headers["sec-websocket-protocol"];
    let fromProto = "";
    if (typeof proto === "string") {
      // "grokworld,<token>" or "grokworld.<token>"
      const parts = proto.split(/[,\s]+/).map((p) => p.trim());
      for (const p of parts) {
        if (p.startsWith("grokworld.")) fromProto = p.slice("grokworld.".length);
      }
    }
    const got = bearer || apiKey || q || fromProto;
    return (
      (Boolean(tokens.local) && safeEqual(got, tokens.local)) ||
      (Boolean(tokens.agent) && safeEqual(got, tokens.agent))
    );
  } catch {
    return false;
  }
}
