import { getExecOutput } from "@actions/exec";

// The commands below need these whatever the runner's nix.conf enables.
const NIX = ["--extra-experimental-features", "nix-command flakes"];

async function nix(args: readonly string[]): Promise<string> {
	const { stdout } = await getExecOutput("nix", [...NIX, ...args], { silent: true });
	return stdout;
}

export async function nixVersion(): Promise<string | undefined> {
	try {
		return (await nix(["--version"])).trim();
	} catch {
		return undefined;
	}
}

/** Every valid path in the store. */
export async function storePaths(): Promise<string[]> {
	return lines(await nix(["path-info", "--all"]));
}

/** The closures of store paths or installables. */
export async function closures(items: readonly string[]): Promise<string[]> {
	return lines(await nix(["path-info", "--recursive", ...items]));
}

/** Builds a flake's default package; returns its output path. */
export async function build(flake: string): Promise<string> {
	const [out] = lines(await nix(["build", flake, "--no-link", "--print-out-paths"]));
	if (!out) throw new Error(`nix build ${flake} printed no output path`);
	return out;
}

function lines(text: string): string[] {
	return text.split("\n").map((l) => l.trim()).filter(Boolean);
}
