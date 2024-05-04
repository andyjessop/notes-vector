import type OpenAI from "openai";
import type {
	Document,
	DocumentWithVector,
	RemoteFile,
	RemoteFileWithContent,
} from "../types";
import {
	buildSectionContent,
	parseMarkdownSections,
} from "./parse-markdown-sections";
import type { Logger } from "../logger/Logger";
import { create40CharHash } from "utils/create-40-char-hash";

export class VectorManager {
	#kv: KVNamespace;
	#logger: Logger;
	#openai: OpenAI;
	#vaultKey: string;
	#vectorize: VectorizeIndex;

	constructor(
		kv: KVNamespace,
		logger: Logger,
		openai: OpenAI,
		vaultKey: string,
		vectorize: VectorizeIndex,
	) {
		this.#kv = kv;
		this.#logger = logger;
		this.#openai = openai;
		this.#vaultKey = vaultKey;
		this.#vectorize = vectorize;
	}

	buildKvVectorIdKey(path: string) {
		return `${this.#vaultKey}_vector-ids_${path}`;
	}

	buildKvEmbeddingIdKey(path: string, index: number) {
		// hash the path to avoid hitting the key size limit (64 characters)
		return create40CharHash(`${this.#vaultKey}_embedding-id_${path}_${index}`);
	}

	async addEmbeddings(file: RemoteFileWithContent) {
		this.#logger.info(`Adding embeddings for file ${file.path}.`);

		this.#logger.info(`Parsing sections for file ${file.path}.`);

		const sectionsPromises = parseMarkdownSections(file.content).map(
			async (section, i) => ({
				...file,
				content: buildSectionContent(section),
				section: {
					heading: section.heading,
					level: section.level,
					path: section.path,
				},
				id: await this.buildKvEmbeddingIdKey(file.path, i + 1),
			}),
		);

		const sections = await Promise.all(sectionsPromises);

		this.#logger.success(`Successfully parsed sections for file ${file.path}.`);

		const document = {
			...file,
			id: await this.buildKvEmbeddingIdKey(file.path, 0),
		};

		const allDocuments = [document, ...sections] as Document[];

		let successful = true;
		const embeddings = new Set<DocumentWithVector>();

		this.#logger.info(
			`Embedding ${allDocuments.length} documents for file ${file.path}.`,
		);

		for (const document of allDocuments) {
			try {
				const embedding = await this.#openai.embeddings.create({
					encoding_format: "float",
					input: document.content,
					model: "text-embedding-3-small",
				});

				const vector = embedding?.data?.[0].embedding;

				if (!vector?.length) {
					successful = false;
					break;
				}

				embeddings.add({
					...document,
					vector,
				});
			} catch (e) {
				successful = false;
				this.#logger.error(
					`Failed to create embeddings for file ${file.path}. ${JSON.stringify(
						e,
					)}`,
				);
				break;
			}
		}

		if (successful === false) {
			this.#logger.error(`Failed to embed documents for file ${file.path}.`);

			return false;
		}

		this.#logger.success(
			`Successfully created embedding documents for file ${file.path}.`,
		);

		this.#logger.info(
			`Inserting ${embeddings.size} embeddings for file ${file.path}.`,
		);

		for (const embedding of embeddings) {
			const { content, id, vector, ...metadata } = embedding;
			try {
				await this.#vectorize.insert([
					{
						id: embedding.id,
						values: embedding.vector,
						metadata,
					},
				]);
			} catch (e) {
				this.#logger.error(
					`Failed to insert embedding for embedding ${JSON.stringify(
						embedding,
					)}}. ${JSON.stringify(e)}`,
				);
			}
		}

		this.#logger.success(
			`Successfully inserted ${embeddings.size} embeddings for file ${file.path}.`,
		);

		const embeddingsArray = [...embeddings];

		this.#logger.info(
			`Storing ${embeddingsArray.length} vector ids for file ${file.path}.`,
		);

		await this.#kv.put(
			this.buildKvVectorIdKey(file.path),
			JSON.stringify(embeddingsArray.map((embedding) => embedding.id)),
		);

		this.#logger.success(
			`Successfully stored ${embeddingsArray.length} vector ids for file ${file.path}.`,
		);

		return embeddingsArray;
	}

	async deleteEmbeddings(file: RemoteFile) {
		try {
			this.#logger.info(`Deleting embeddings for file ${file.path}.`);

			const key = this.buildKvVectorIdKey(file.path);

			// First delete any existing vectors for the file
			const existingVectorIds = await this.#kv.get(key);

			if (existingVectorIds) {
				this.#logger.info(
					`Deleting ${existingVectorIds.length} existing vectors for file ${file.path}.`,
				);

				await this.#vectorize.deleteByIds(JSON.parse(existingVectorIds));
				await this.#kv.delete(key);

				this.#logger.success(
					`Successfully deleted ${existingVectorIds.length} existing vectors for file ${file.path}.`,
				);
			} else {
				this.#logger.info(`No existing vectors found for file ${file.path}.`);
			}

			return true;
		} catch (e) {
			this.#logger.error(
				`Failed to delete embeddings for file ${file.path}. ${JSON.stringify(
					e,
				)}`,
			);

			return false;
		}
	}

	async getQueryMatches(query: string, type?: string) {
		this.#logger.info("Searching for matches for query.");

		const embedding = await this.#openai.embeddings.create({
			encoding_format: "float",
			input: query,
			model: "text-embedding-3-small",
		});

		const vector = embedding?.data?.[0].embedding;

		if (!vector?.length) {
			this.#logger.error("Failed to create embedding.");
			return [];
		}

		return this.getVectorMatches(vector, type);
	}

	async getVectorMatches(vector: number[], type?: string) {
		if (!vector?.length) {
			this.#logger.error("Failed to create embedding.");
			return [];
		}

		this.#logger.success("Successfully created embedding.");

		const queryResponse = await this.#vectorize.query(vector, {
			topK: 20,
			filter: type ? { type } : undefined,
			returnValues: true,
			returnMetadata: true,
		});

		this.#logger.success(
			`Successfully retrieved ${queryResponse.matches.length} matches.`,
		);

		return queryResponse.matches.map((match) => match.metadata);
	}
}
