import { KeyManager } from "model/KeyManager";
import type { Context, Next } from "../types";

export async function auth(c: Context, next: Next) {
	const keyManager = new KeyManager(c.get("Logger"));
	const apiKey = c.get("OBSIDIAN_VECTOR_API_KEY");
	const vaultKey = c.get("OBSIDIAN_VECTOR_VAULT_KEY");

	const isAuthorized = await keyManager.isAuthorized(apiKey, vaultKey);

	if (!isAuthorized) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	await next();
}
