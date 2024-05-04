import type {
	Hono,
	Context as HonoContext,
	MiddlewareHandler as HonoMiddlewareHandler,
} from "hono";
import type { FileManager } from "./model/FileManager";
import type OpenAI from "openai";
import type { VectorManager } from "./model/VectorManager";
import type { Logger } from "./logger/Logger";

export type Env = {
	// biome-ignore lint/suspicious/noExplicitAny: disable
	AI: any;
	KV: KVNamespace;
	VECTORIZE_INDEX: VectorizeIndex;
};

export type Variables = {
	FileManager: FileManager;
	Logger: Logger;
	OpenAi: OpenAI;
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
	id: string;
};

export type DocumentWithVector = Document & {
	vector: number[];
};

export type BaseQuery = {
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
