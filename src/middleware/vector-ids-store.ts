import type { VectorIdsStore } from "storage/VectorIdsStore";
import type { FileStore } from "../storage/FileStore";
import type { Context, Next } from "../types";

export async function vectorIdsStore(c: Context, next: Next) {
	const vaultKey = c.get("OBSIDIAN_VECTOR_VAULT_KEY");

	const id = c.env.VECTOR_IDS_STORE.idFromName(vaultKey);
	const stub = c.env.VECTOR_IDS_STORE.get(id) as unknown as VectorIdsStore;

	c.set("VectorIdsStore", stub);

	// Seed KV
	// const kv = c.get("ConsistentKv");
	// await kv.put("cloudflare_keys", JSON.stringify(["142501103df"]));

	await next();
}
