import type { Logger } from "../logger/Logger";
import type { RemoteFile, RemoteFileWithContent } from "../types";

export class FileManager {
	#kv: KVNamespace;
	#logger: Logger;
	#vaultKey: string;

	constructor(kv: KVNamespace, logger: Logger, vaultKey: string) {
		this.#kv = kv;
		this.#logger = logger;
		this.#vaultKey = vaultKey;
	}

	async getFiles(): Promise<RemoteFile[]> {
		try {
			this.#logger.info(`Getting files for vault key ${this.#vaultKey}.`);

			const filesStr = await this.#kv.get(`${this.#vaultKey}_files`);

			if (filesStr === null) {
				this.#logger.error(`No files found for vault key ${this.#vaultKey}.`);
				await this.#kv.put(`${this.#vaultKey}_files`, JSON.stringify([]));

				return [];
			}

			this.#logger.info(`Parsing files for vault key ${this.#vaultKey}.`);

			const files = JSON.parse(filesStr);

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
				`Adding file ${file.basename} to vault key ${this.#vaultKey}.`,
			);

			const files = await this.getFiles();

			// check if file exists first, and overwrite if it does
			const existingFileIndex = files.findIndex(
				(f) => f.basename === file.basename,
			);

			// Defensively remove content
			const { content, ...rest } = file as RemoteFileWithContent;

			if (existingFileIndex !== -1) {
				this.#logger.info(`File ${file.basename} already exists, updating.`);

				files[existingFileIndex] = rest;
			} else {
				this.#logger.info(`File ${file.basename} does not exist, adding.`);

				files.push(rest);
			}

			await this.#kv.put(`${this.#vaultKey}_files`, JSON.stringify(files));

			this.#logger.success(
				`Successfully added file ${file.basename} to vault key ${this.#vaultKey}.`,
			);

			return true;
		} catch (e) {
			this.#logger.error(
				`Failed to add file ${file.basename} to vault key ${this.#vaultKey}.`,
			);

			return false;
		}
	}

	async deleteFile(file: RemoteFile) {
		try {
			this.#logger.info(
				`Deleting file ${file.basename} from vault key ${this.#vaultKey}.`,
			);

			const files = await this.getFiles();
			const existingFileIndex = files.findIndex(
				(f) => f.basename === file.basename,
			);

			if (existingFileIndex !== -1) {
				this.#logger.info(`File ${file.basename} found, deleting from array.`);

				files.splice(existingFileIndex, 1);
			} else {
				this.#logger.error(`File ${file.basename} not found.`);
				return true;
			}

			this.#logger.info(`Updating files for vault key ${this.#vaultKey}.`);

			await this.#kv.put(`${this.#vaultKey}_files`, JSON.stringify(files));

			this.#logger.success(
				`Successfully deleted file ${file.basename} from vault key ${this.#vaultKey}.`,
			);

			return true;
		} catch (e) {
			this.#logger.error(
				`Failed to delete file ${file.basename} from vault key ${this.#vaultKey}.`,
			);

			return false;
		}
	}
}
