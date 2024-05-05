import type { Logger } from "../logger/Logger";

export class KeyManager {
	#authorizedKeys: string[];
	#logger: Logger;

	constructor(logger: Logger) {
		this.#authorizedKeys = ["142501103df"];
		this.#logger = logger;
	}

	async isAuthorized(key: string, vaultKey: string): Promise<boolean> {
		try {
			this.#logger.info(
				`Checking if key ${key} is authorized with vault key ${vaultKey}.`,
			);

			this.#logger.info(
				`Authorized keys entry found for vault key ${vaultKey}.`,
			);

			if (!this.#authorizedKeys.includes(key)) {
				this.#logger.error(
					`Authorized keys are ${this.#authorizedKeys} for vault key ${vaultKey}, ${key} provided.`,
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
