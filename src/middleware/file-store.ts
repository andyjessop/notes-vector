import type { FileStore } from "../storage/FileStore";
import type { Context, Next } from "../types";

export async function fileStore(c: Context, next: Next) {
	const vaultKey = c.get("OBSIDIAN_VECTOR_VAULT_KEY");

	const id = c.env.FILE_STORE.idFromName(vaultKey);
	const stub = c.env.FILE_STORE.get(id) as unknown as FileStore;

	c.set("FileStore", stub);

	// Seed KV
	// const kv = c.get("ConsistentKv");
	// await kv.put("cloudflare_keys", JSON.stringify(["142501103df"]));

	await next();
}
