import { DurableObject } from "cloudflare:workers";

export class VectorIdsStore extends DurableObject {
	async get(key: string): Promise<string[] | undefined> {
		return this.ctx.storage.get(key);
	}

	async put(key: string, ids: string[]) {
		return this.ctx.storage.put(key, ids);
	}

	async delete(key: string) {
		return this.ctx.storage.delete(key);
	}
}
