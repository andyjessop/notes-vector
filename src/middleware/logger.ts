import * as Logger from "../logger/Logger";
import type { Context, Next } from "../types";

export async function logger(ctx: Context, next: Next) {
	ctx.set("Logger", Logger);

	await next();
}
