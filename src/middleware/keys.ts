import type { Context, Next } from "../types";

export async function keys(c: Context, next: Next) {
	c.set("OBSIDIAN_VECTOR_VAULT_KEY", c.req.header("OBSIDIAN_VECTOR_VAULT_KEY"));
	c.set("OBSIDIAN_VECTOR_API_KEY", c.req.header("OBSIDIAN_VECTOR_API_KEY"));
	c.set("OPENAI_API_KEY", c.req.header("OPENAI_API_KEY"));

	await next();
}
