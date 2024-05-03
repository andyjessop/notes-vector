import { VectorManager } from "../model/VectorManager";
import type { Context, Next } from "../types";

export async function vectorManager(c: Context, next: Next) {
	const logger = c.get("Logger");
	const openai = c.get("OpenAi");

	c.set(
		"VectorManager",
		new VectorManager(
			c.env.KV,
			logger,
			openai,
			c.req.header("OBSIDIAN_VECTOR_VAULT_KEY"),
			c.env.VECTORIZE_INDEX,
		),
	);

	await next();
}
