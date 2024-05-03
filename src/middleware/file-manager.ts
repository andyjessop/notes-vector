import { FileManager } from "../model/FileManager";
import type { Context, Next } from "../types";

export async function fileManager(c: Context, next: Next) {
	c.set(
		"FileManager",
		new FileManager(
			c.env.KV,
			c.get("Logger"),
			c.req.header("OBSIDIAN_VECTOR_VAULT_KEY"),
		),
	);

	await next();
}
