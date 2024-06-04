import type {
	Hono,
	Context as HonoContext,
	MiddlewareHandler as HonoMiddlewareHandler,
} from "hono";
import type { FileManager } from "./model/FileManager";
import type OpenAI from "openai";
import type { VectorManager } from "./model/VectorManager";
import type { Logger } from "./logger/Logger";
import type { FileStore } from "./storage/FileStore";
import type { VectorIdsStore } from "./storage/VectorIdsStore";

export type Env = {
	// biome-ignore lint/suspicious/noExplicitAny: disable
	AI: any;
	FILE_STORE: DurableObjectNamespace<FileStore>;
	KV: KVNamespace;
	VECTOR_IDS_STORE: DurableObjectNamespace<VectorIdsStore>;
	VECTORIZE_INDEX: VectorizeIndex;
};

const t = {} as Env["FILE_STORE"];

export type Variables = {
	FileManager: FileManager;
	FileStore: FileStore;
	Logger: Logger;
	OpenAi: OpenAI;
	OBSIDIAN_VECTOR_VAULT_KEY: string;
	OBSIDIAN_VECTOR_API_KEY: string;
	OPENAI_API_KEY: string;
	VectorIdsStore: VectorIdsStore;
	VectorManager: VectorManager;
};

export type App = Hono<{ Bindings: Env; Variables: Variables }>;

export type MiddlewareHandler = HonoMiddlewareHandler<{
	Bindings: Env;
	Variables: Variables;
}>;
export type Context = HonoContext<{ Bindings: Env; Variables: Variables }>;
export type Next = () => Promise<void>;

export type RemoteFile = {
	mtime: number;
	basename: string;
	path: string;
	type: string;
};

export type RemoteFileWithContent = RemoteFile & {
	content: string;
};

export type Document = RemoteFileWithContent & {
	isSection: boolean;
	id: string;
};

export type Section = Document & {
	isSection: boolean;
	section: {
		heading: string;
		level: number;
		path: string;
	};
};

export type DocumentWithVector = Document & {
	vector: number[];
};

export type SectionWithVector = Section & {
	vector: number[];
};

export type DocumentMetadata = Omit<
	DocumentWithVector,
	"content" | "id" | "vector"
>;

export type SectionMetadata = Omit<
	SectionWithVector,
	"content" | "id" | "vector"
>;

export function isDocumentMetadata(obj: unknown): obj is DocumentMetadata {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"basename" in obj &&
		"path" in obj &&
		"mtime" in obj &&
		"type" in obj
	);
}

export function isSectionMetadata(obj: unknown): obj is SectionMetadata {
	if (!isDocumentMetadata(obj)) {
		return false;
	}

	const alias = obj as SectionMetadata;

	return (
		typeof alias.section === "object" &&
		typeof alias.section.heading === "string" &&
		typeof alias.section.level === "number" &&
		typeof alias.section.path === "string" &&
		typeof alias.isSection === "boolean"
	);
}

export type BaseQuery = {
	isSection?: boolean;
	type?: string;
};

export type TextQuery = BaseQuery & {
	text: string;
};

export type VectorQuery = BaseQuery & {
	vector: number[];
};

export function isTextQuery(query: BaseQuery): query is TextQuery {
	return (query as TextQuery).text !== undefined;
}

export function isVectorQuery(query: BaseQuery): query is VectorQuery {
	return (query as VectorQuery).vector !== undefined;
}
