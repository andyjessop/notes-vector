import type { VectorIdsStore } from "storage/VectorIdsStore";
import type { Context, Next } from "../types";

export async function vectorIdsStore(c: Context, next: Next) {
	const vaultKey = c.get("OBSIDIAN_VECTOR_VAULT_KEY");

	const id = c.env.VECTOR_IDS_STORE.idFromName(vaultKey);
	const stub = c.env.VECTOR_IDS_STORE.get(id) as unknown as VectorIdsStore;

	c.set("VectorIdsStore", stub);

	await next();
}
