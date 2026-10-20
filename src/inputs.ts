import * as core from "@actions/core";

export interface Inputs {
	readonly name: string;
	readonly authToken: string | undefined;
	readonly server: string;
	readonly publicKey: string;
	readonly isPrivate: boolean;
	readonly skipPush: boolean;
	readonly pathsToPush: readonly string[];
	readonly pushFilter: RegExp | undefined;
	readonly jobs: number;
	readonly cli: string;
}

// The server's own rule for cache names.
const CACHE_NAME = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/;

export function readInputs(): Inputs {
	const name = core.getInput("name", { required: true });
	if (!CACHE_NAME.test(name)) {
		throw new Error(`name: "${name}" is not a cache name (lowercase letters, digits and dashes)`);
	}
	const authToken = core.getInput("authToken") || undefined;
	if (authToken) core.setSecret(authToken);

	const server = core.getInput("server");
	if (!URL.canParse(server)) throw new Error(`server: "${server}" is not a URL`);

	const jobs = Number(core.getInput("jobs"));
	if (!Number.isInteger(jobs) || jobs < 1) throw new Error("jobs: must be a positive integer");

	const filter = core.getInput("pushFilter");
	return {
		name,
		authToken,
		server,
		publicKey: core.getInput("publicKey"),
		isPrivate: core.getBooleanInput("private"),
		skipPush: core.getBooleanInput("skipPush"),
		pathsToPush: core.getInput("pathsToPush").split(/\s+/).filter(Boolean),
		pushFilter: filter ? new RegExp(filter) : undefined,
		jobs,
		cli: core.getInput("cli"),
	};
}
