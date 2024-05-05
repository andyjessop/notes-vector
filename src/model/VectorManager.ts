import type OpenAI from "openai";
import {
	isDocumentMetadata,
	isSectionMetadata,
	type Document,
	type DocumentMetadata,
	type DocumentWithVector,
	type RemoteFile,
	type RemoteFileWithContent,
	type Section,
	type SectionMetadata,
	type SectionWithVector,
} from "../types";
import {
	buildSectionContent,
	parseMarkdownSections,
} from "./parse-markdown-sections";
import type { Logger } from "../logger/Logger";
import { create40CharHash } from "utils/create-40-char-hash";
import type { VectorIdsStore } from "../storage/VectorIdsStore";

export class VectorManager {
	#vectorIdsStore: VectorIdsStore;
	#logger: Logger;
	#openai: OpenAI;
	#vaultKey: string;
	#vectorize: VectorizeIndex;

	constructor(
		vectorIdsStore: VectorIdsStore,
		logger: Logger,
		openai: OpenAI,
		vaultKey: string,
		vectorize: VectorizeIndex,
	) {
		this.#vectorIdsStore = vectorIdsStore;
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
				isSection: true,
				section: {
					heading: section.heading,
					level: section.level,
					path: section.path,
				},
				id: await this.buildKvEmbeddingIdKey(file.path, i + 1),
			}),
		) as Promise<Section>[];

		const sections = await Promise.all(sectionsPromises);

		this.#logger.success(`Successfully parsed sections for file ${file.path}.`);

		const document = {
			...file,
			isSection: false,
			id: await this.buildKvEmbeddingIdKey(file.path, 0),
		};

		const allDocuments = [document, ...sections] as Array<Document | Section>;

		let successful = true;
		const embeddings = new Set<DocumentWithVector | SectionWithVector>();

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

		await this.#vectorIdsStore.put(
			this.buildKvVectorIdKey(file.path),
			embeddingsArray.map((embedding) => embedding.id),
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
			const existingVectorIds = await this.#vectorIdsStore.get(key);

			if (existingVectorIds) {
				this.#logger.info(
					`Deleting ${existingVectorIds.length} existing vectors for file ${file.path}.`,
				);

				await this.#vectorize.deleteByIds(existingVectorIds);
				await this.#vectorIdsStore.delete(key);

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

	async getQueryMatches(query: string, type?: string, isSection = false) {
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

		this.#logger.success("Successfully created embedding.");

		return this.getVectorMatches(vector, type, isSection);
	}

	async getVectorMatches(
		vector: number[],
		type?: string,
		isSection = false,
	): Promise<Array<SectionMetadata | DocumentMetadata>> {
		const filter = {
			isSection,
		} as Record<string, string | boolean>;

		if (type) {
			filter.type = type;
		}

		this.#logger.info(
			`Querying vector db with filter: ${JSON.stringify(filter)}`,
		);

		const queryResponse = await this.#vectorize.query(vector, {
			topK: 20,
			filter: Object.keys(filter).length ? filter : undefined,
			returnValues: true,
			returnMetadata: true,
		});

		this.#logger.success(
			`Successfully retrieved ${queryResponse.matches.length} matches.`,
		);

		const matches = queryResponse.matches.map((match) => match.metadata);

		if (
			!matches.every(
				(match) => isDocumentMetadata(match) || isSectionMetadata(match),
			)
		) {
			this.#logger.error("Failed to retrieve matches.");
			return [];
		}

		return matches as Array<SectionMetadata | DocumentMetadata>;
	}
}
