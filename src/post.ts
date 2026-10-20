import * as core from "@actions/core";
import { exec } from "@actions/exec";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { readInputs } from "./inputs.js";
import { closures, storePaths } from "./nix.js";
import { batches, newStorePaths } from "./settings.js";
import { State } from "./state.js";

/**
 * After the job: pushes the store paths it made, or the closures of
 * pathsToPush. The server leaves out what it already has, and what an
 * upstream cache such as cache.nixos.org serves.
 */
async function post(): Promise<void> {
	const cli = core.getState(State.Cli);
	if (!cli) return;
	const inputs = readInputs();
	if (!inputs.authToken) return;

	let paths: string[];
	if (inputs.pathsToPush.length > 0) {
		paths = (await closures(inputs.pathsToPush)).filter((p) => !inputs.pushFilter?.test(p));
	} else {
		const before = new Set((await readFile(core.getState(State.StorePaths), "utf8")).split("\n"));
		paths = newStorePaths(before, await storePaths(), inputs.pushFilter);
	}
	if (paths.length === 0) {
		core.info("No new store paths to push");
		return;
	}

	// The CLI keeps its login under HOME; a home of its own leaves the
	// runner's untouched.
	const home = join(process.env.RUNNER_TEMP ?? "/tmp", "snowstead-home");
	await mkdir(home, { recursive: true });
	const env = { ...process.env, HOME: home } as Record<string, string>;
	const snowstead = join(cli, "bin", "snowstead");
	await exec(snowstead, ["login", "action", inputs.server, inputs.authToken], { env, silent: true });

	await core.group(`Pushing ${paths.length} store paths to ${inputs.name}`, async () => {
		for (const batch of batches(paths)) {
			await exec(snowstead, ["push", inputs.name, "--jobs", String(inputs.jobs), ...batch], { env });
		}
	});
}

post().catch((err: unknown) => {
	core.setFailed(err instanceof Error ? err.message : String(err));
});
