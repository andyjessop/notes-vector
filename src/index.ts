import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, Query, RemoteFileWithContent, Variables } from "./types";
import { auth } from "./middleware/auth";
import { fileManager } from "./middleware/file-manager";
import { openAi } from "./middleware/openai";
import { vectorManager } from "./middleware/vector-manager";
import { logger } from "./middleware/logger";

export const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use(cors({ origin: ["app://obsidian.md"] }));
app.use(logger);
app.use(auth);
app.use(fileManager);
app.use(openAi);
app.use(vectorManager);

app.get("/api/files", async (c) => {
	const fileManager = c.get("FileManager");

	const files = await fileManager.getFiles();

	return c.json({ data: files });
});

app.post("/api/files", async (c) => {
	const file = (await c.req.json()) as RemoteFileWithContent;
	const fileManager = c.get("FileManager");
	const vectorManager = c.get("VectorManager");

	const deletedEmbeddings = await vectorManager.deleteEmbeddings(file);

	if (!deletedEmbeddings) {
		return c.json({ error: "Failed to delete file embeddings" }, 500);
	}

	const deleteFile = await fileManager.deleteFile(file);

	if (!deleteFile) {
		return c.json({ error: "Failed to delete file" }, 500);
	}

	const embeddings = await vectorManager.addEmbeddings(file);

	if (!embeddings) {
		return c.json({ error: "Failed to add file embeddings" }, 500);
	}

	const added = await fileManager.addFile(file);

	if (!added) {
		return c.json({ error: "Failed to add file" }, 500);
	}

	return c.json(`${embeddings.length} embeddings created.`);
});

app.delete("/api/files", async (c) => {
	const file = (await c.req.json()) as RemoteFileWithContent;
	const fileManager = c.get("FileManager");
	const vectorManager = c.get("VectorManager");

	const deletedEmbeddings = await vectorManager.deleteEmbeddings(file);

	if (!deletedEmbeddings) {
		return c.json({ error: "Failed to delete file embeddings" }, 500);
	}

	const deleted = await fileManager.deleteFile(file);

	if (!deleted) {
		return c.json({ error: "Failed to delete file" }, 500);
	}

	return c.json("File deleted.");
});

export default {
	fetch: app.fetch,
};

app.post("/related", async (c) => {
	const query = (await c.req.json()) as Query;
	const vectorManager = c.get("VectorManager");

	const people = await vectorManager.getMatches(query.text, query.type);

	return c.json({ data: people });
});
