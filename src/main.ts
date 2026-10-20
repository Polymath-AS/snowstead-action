import * as core from "@actions/core";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { readInputs } from "./inputs.js";
import { build, nixVersion, storePaths } from "./nix.js";
import { netrc, nixConfig, substituterUrl } from "./settings.js";
import { State } from "./state.js";

/**
 * Before the job: Nix substitutes from the cache from here on, and, when
 * the job will push, the CLI is built and the store's paths are recorded,
 * so the post step can tell which paths the job made.
 */
async function main(): Promise<void> {
	const inputs = readInputs();
	const version = await nixVersion();
	if (!version) {
		throw new Error("Nix is not installed: install it in an earlier step, such as DeterminateSystems/nix-installer-action");
	}
	if (inputs.isPrivate && !inputs.authToken) {
		throw new Error("authToken: a private cache needs a token with pull permission");
	}

	const temp = process.env.RUNNER_TEMP ?? "/tmp";
	let netrcFile: string | undefined;
	if (inputs.isPrivate && inputs.authToken) {
		netrcFile = join(temp, "snowstead-netrc");
		await writeFile(netrcFile, netrc(inputs.server, inputs.authToken), { mode: 0o600 });
	}
	const substituter = substituterUrl(inputs.server, inputs.name, inputs.isPrivate);
	const config = nixConfig(process.env.NIX_CONFIG, { substituter, publicKey: inputs.publicKey, netrcFile });
	core.exportVariable("NIX_CONFIG", config);
	process.env.NIX_CONFIG = config;
	core.info(`Substituting from ${substituter} (${version})`);

	if (!inputs.authToken || inputs.skipPush) {
		core.info(inputs.skipPush ? "skipPush is set: nothing will be pushed" : "No authToken: nothing will be pushed");
		return;
	}

	// The CLI first, so its own paths are in the store before it is recorded.
	const cli = await core.group(`Building the Snowstead CLI (${inputs.cli})`, () => build(inputs.cli));
	core.saveState(State.Cli, cli);

	if (inputs.pathsToPush.length === 0) {
		const before = join(temp, "snowstead-store-paths");
		await writeFile(before, (await storePaths()).join("\n"));
		core.saveState(State.StorePaths, before);
	}
}

main().catch((err: unknown) => {
	core.setFailed(err instanceof Error ? err.message : String(err));
});
