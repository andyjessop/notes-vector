import { KeyManager } from "model/KeyManager";
import type { Context, Next } from "../types";

export async function auth(c: Context, next: Next) {
	const keyManager = new KeyManager(c.env.KV, c.get("Logger"));

	const isAuthorized = await keyManager.isAuthorized(
		c.req.header("OBSIDIAN_VECTOR_API_KEY"),
		c.req.header("OBSIDIAN_VECTOR_VAULT_KEY"),
	);

	if (!isAuthorized) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	await next();
}
