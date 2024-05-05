import { DurableObject } from "cloudflare:workers";
import type { RemoteFile } from "../types";

export class FileStore extends DurableObject {
	async getAll(): Promise<RemoteFile[]> {
		const list = await this.ctx.storage.list<RemoteFile>();

		return Array.from(list.values());
	}

	async get(file: RemoteFile): Promise<RemoteFile | undefined> {
		return this.ctx.storage.get(file.path);
	}

	async put(file: RemoteFile) {
		return this.ctx.storage.put(file.path, file);
	}

	async delete(file: RemoteFile) {
		return this.ctx.storage.delete(file.path);
	}
}
