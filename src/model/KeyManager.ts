import type { Logger } from "../logger/Logger";

export class KeyManager {
	#kv: KVNamespace;
	#logger: Logger;

	constructor(kv: KVNamespace, logger: Logger) {
		this.#kv = kv;
		this.#logger = logger;
	}

	async isAuthorized(key: string, vaultKey: string): Promise<boolean> {
		try {
			const authorizedKeys = await this.#kv.get(`${vaultKey}_keys`);

			this.#logger.info(
				`Checking if key ${key} is authorized with vault key ${vaultKey}.`,
			);

			if (!authorizedKeys) {
				this.#logger.error(
					`Authorized keys are ${authorizedKeys} for vault key ${vaultKey}.`,
				);
				return false;
			}

			this.#logger.info(
				`Authorized keys entry found for vault key ${vaultKey}.`,
			);

			const vaultKeys = JSON.parse(authorizedKeys);

			if (!vaultKeys.includes(key)) {
				this.#logger.error(
					`Authorized keys are ${authorizedKeys} for vault key ${vaultKey}, ${key} provided.`,
				);

				return false;
			}

			this.#logger.success(
				`Key found in authorized keys for vault key ${vaultKey}.`,
			);

			return true;
		} catch (e) {
			this.#logger.error(
				`Failed to check if key ${key} is authorized with vault key ${vaultKey}.`,
			);

			return false;
		}
	}
}
