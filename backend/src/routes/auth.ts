import { Hono } from "hono";
import { ApiLoginSchema } from "@poker-hub/db";
import {
  clearSessionCookie,
  hasValidSession,
  isAuthConfigured,
  isPasswordValid,
  setSessionCookie,
} from "../auth";

const app = new Hono();

app.post("/login", async (c) => {
  if (!isAuthConfigured()) {
    return c.json({ error: "Authentication is not configured" }, 503);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = ApiLoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  if (!isPasswordValid(parsed.data.password)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  setSessionCookie(c);
  return c.json({ ok: true as const });
});

app.post("/logout", (c) => {
  clearSessionCookie(c);
  return c.json({ ok: true as const });
});

app.get("/me", (c) => {
  if (!hasValidSession(c)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  return c.json({ ok: true as const });
});

export default app;
