import { FileManager } from "../model/FileManager";
import type { Context, Next } from "../types";

export async function fileManager(c: Context, next: Next) {
	const fileStore = c.get("FileStore");

	c.set(
		"FileManager",
		new FileManager(
			fileStore,
			c.get("Logger"),
			c.get("OBSIDIAN_VECTOR_VAULT_KEY"),
		),
	);

	await next();
}
