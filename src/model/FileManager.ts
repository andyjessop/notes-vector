import type { Logger } from "../logger/Logger";
import type { RemoteFile, RemoteFileWithContent } from "../types";
import type { FileStore } from "../storage/FileStore";

export class FileManager {
	#fileStore: FileStore;
	#logger: Logger;
	#vaultKey: string;

	constructor(kv: FileStore, logger: Logger, vaultKey: string) {
		this.#fileStore = kv;
		this.#logger = logger;
		this.#vaultKey = vaultKey;
	}

	async getFiles(): Promise<RemoteFile[]> {
		try {
			this.#logger.info(`Getting files for vault key ${this.#vaultKey}.`);

			const files = this.#fileStore.getAll();

			this.#logger.info(
				`Successfully retrieved files for vault key ${this.#vaultKey}.`,
			);

			return files;
		} catch (e) {
			this.#logger.error(
				`Failed to get files for vault key ${this.#vaultKey}.`,
			);
			return [];
		}
	}

	async addFile(file: RemoteFile) {
		try {
			this.#logger.info(
				`Adding file ${file.path} to vault key ${this.#vaultKey}.`,
			);

			const existingFile = await this.#fileStore.get(file);

			if (!existingFile) {
				this.#logger.info(`File ${file.path} does not exist, adding.`);
			} else {
				this.#logger.info(`File ${file.path} already exists, updating.`);
			}

			await this.#fileStore.put(file);

			this.#logger.success(
				`Successfully added file ${file.path} to vault key ${this.#vaultKey}.`,
			);

			return true;
		} catch (e) {
			this.#logger.error(
				`Failed to add file ${file.path} to vault key ${this.#vaultKey}.`,
			);

			return false;
		}
	}

	async deleteFile(file: RemoteFile) {
		try {
			this.#logger.info(
				`Deleting file ${file.path} from vault key ${this.#vaultKey}.`,
			);

			const existingFile = await this.#fileStore.get(file);

			if (!existingFile) {
				this.#logger.info(`File ${file.path} not found.`);
			} else {
				this.#logger.info(`File ${file.path} found, deleting.`);
			}

			this.#fileStore.delete(file);

			this.#logger.success(
				`Successfully deleted file ${file.path} from vault key ${this.#vaultKey}.`,
			);

			return true;
		} catch (e) {
			this.#logger.error(
				`Failed to delete file ${file.path} from vault key ${this.#vaultKey}.`,
			);

			return false;
		}
	}
}
