import { Hono } from "hono";
import { cors } from "hono/cors";
import {
	isTextQuery,
	isVectorQuery,
	type Env,
	type RemoteFileWithContent,
	type TextQuery,
	type Variables,
	type VectorQuery,
} from "./types";
import { auth } from "./middleware/auth";
import { fileManager } from "./middleware/file-manager";
import { openAi } from "./middleware/openai";
import { vectorManager } from "./middleware/vector-manager";
import { logger } from "./middleware/logger";
import { keys } from "./middleware/keys";
import { fileStore } from "./middleware/file-store";
import { vectorIdsStore } from "./middleware/vector-ids-store";
export { FileStore } from "./storage/FileStore";
export { VectorIdsStore } from "./storage/VectorIdsStore";

export const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use(cors({ origin: ["app://obsidian.md"] }));
app.use(logger);
app.use(keys);
app.use(fileStore);
app.use(vectorIdsStore);
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

app.delete("/api/files/all", async (c) => {
	const fileManager = c.get("FileManager");
	const vectorManager = c.get("VectorManager");

	const files = await fileManager.getFiles();

	for (const file of files) {
		const deletedEmbeddings = await vectorManager.deleteEmbeddings(file);

		if (!deletedEmbeddings) {
			return c.json({ error: "Failed to delete file embeddings" }, 500);
		}

		const deleted = await fileManager.deleteFile(file);

		if (!deleted) {
			return c.json({ error: "Failed to delete file" }, 500);
		}
	}

	return c.json({ data: { deletedCount: files.length } });
});

export default {
	fetch: app.fetch,
};

app.post("/api/related", async (c) => {
	const query = (await c.req.json()) as TextQuery | VectorQuery;
	const vectorManager = c.get("VectorManager");
	const logger = c.get("Logger");

	let results = [];

	if (isTextQuery(query)) {
		logger.info(
			`Searching for related content for text query with params: ${JSON.stringify(
				{
					type: query.type,
					isSection: query.isSection,
				},
			)}`,
		);

		results = await vectorManager.getQueryMatches(
			query.text,
			query.type,
			query.isSection,
		);
	} else if (isVectorQuery(query)) {
		logger.info(
			`Searching for related content for vector query with params: ${JSON.stringify(
				{
					type: query.type,
					isSection: query.isSection,
				},
			)}`,
		);
		results = await vectorManager.getVectorMatches(
			query.vector,
			query.type,
			query.isSection,
		);
	} else {
		return c.json(
			{ error: "Query must include `text` or `vector` components." },
			400,
		);
	}

	return c.json({ data: results });
});
