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

	buildKvVectorIdKey(basename: string) {
		return `${this.#vaultKey}_vector-ids_${basename}`;
	}

	async addEmbeddings(file: RemoteFileWithContent) {
		this.#logger.info(`Adding embeddings for file ${file.basename}.`);

		const timestamp = Date.now();

		this.#logger.info(`Parsing sections for file ${file.basename}.`);

		const sections = parseMarkdownSections(file.content).map((section, i) => ({
			...file,
			content: buildSectionContent(section),
			id: `${file.basename}-${i}`,
		}));

		this.#logger.success(
			`Successfully parsed sections for file ${file.basename}.`,
		);

		const document = {
			...file,
			id: file.basename,
		};

		const allDocuments = [document, ...sections] as Document[];

		let successful = true;
		const embeddings = new Set<DocumentWithVector>();

		this.#logger.info(
			`Embedding ${allDocuments.length} documents for file ${file.basename}.`,
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
				break;
			}
		}

		if (successful === false) {
			this.#logger.error(
				`Failed to embed documents for file ${file.basename}.`,
			);

			return false;
		}

		this.#logger.success(
			`Successfully created embedding documents for file ${file.basename}.`,
		);

		this.#logger.info(
			`Inserting ${embeddings.size} embeddings for file ${file.basename}.`,
		);

		for (const embedding of embeddings) {
			const { id, vector, ...metadata } = embedding;
			await this.#vectorize.insert([
				{
					id: embedding.id,
					values: embedding.vector,
					metadata,
				},
			]);
		}

		this.#logger.success(
			`Successfully inserted ${embeddings.size} embeddings for file ${file.basename}.`,
		);

		const embeddingsArray = [...embeddings];

		this.#logger.info(
			`Storing ${embeddingsArray.length} vector ids for file ${file.basename}.`,
		);

		await this.#kv.put(
			this.buildKvVectorIdKey(file.basename),
			JSON.stringify(embeddingsArray.map((embedding) => embedding.id)),
		);

		this.#logger.success(
			`Successfully stored ${embeddingsArray.length} vector ids for file ${file.basename}.`,
		);

		return embeddingsArray;
	}

	async deleteEmbeddings(file: RemoteFileWithContent) {
		try {
			this.#logger.info(`Deleting embeddings for file ${file.basename}.`);

			const key = this.buildKvVectorIdKey(file.basename);

			// First delete any existing vectors for the file
			const existingVectorIds = await this.#kv.get(key);

			if (existingVectorIds) {
				this.#logger.info(
					`Deleting ${existingVectorIds.length} existing vectors for file ${file.basename}.`,
				);

				await this.#vectorize.deleteByIds(JSON.parse(existingVectorIds));
				await this.#kv.delete(key);

				this.#logger.success(
					`Successfully deleted ${existingVectorIds.length} existing vectors for file ${file.basename}.`,
				);
			} else {
				this.#logger.info(
					`No existing vectors found for file ${file.basename}.`,
				);
			}

			return true;
		} catch (e) {
			this.#logger.error(
				`Failed to delete embeddings for file ${file.basename}.`,
			);

			return false;
		}
	}

	async getMatches(query: string, type?: string) {
		this.#logger.info(`Searching for matches for query: ${query}`);

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
