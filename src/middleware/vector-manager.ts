import { VectorManager } from "../model/VectorManager";
import type { Context, Next } from "../types";

export async function vectorManager(c: Context, next: Next) {
	const logger = c.get("Logger");
	const openai = c.get("OpenAi");
	const vaultKey = c.get("OBSIDIAN_VECTOR_VAULT_KEY");
	const vectorIdsStore = c.get("VectorIdsStore");

	c.set(
		"VectorManager",
		new VectorManager(
			vectorIdsStore,
			logger,
			openai,
			vaultKey,
			c.env.VECTORIZE_INDEX,
		),
	);

	await next();
}
