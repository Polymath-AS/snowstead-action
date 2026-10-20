/** Where Nix substitutes a cache from: private caches are served under /private/. */
export function substituterUrl(server: string, name: string, isPrivate: boolean): string {
	const base = server.replace(/\/+$/, "");
	return isPrivate ? `${base}/private/${name}` : `${base}/${name}`;
}

/**
 * NIX_CONFIG with the cache added to what the job already set. Extra
 * settings add to nix.conf's rather than replacing them, so the job keeps
 * its other substituters; Nix accepts them from trusted users, which the
 * runner's user is with the usual Nix installers.
 */
export function nixConfig(
	existing: string | undefined,
	settings: { readonly substituter: string; readonly publicKey: string; readonly netrcFile?: string },
): string {
	const lines = [
		`extra-substituters = ${settings.substituter}`,
		`extra-trusted-public-keys = ${settings.publicKey}`,
	];
	if (settings.netrcFile) lines.push(`netrc-file = ${settings.netrcFile}`);
	return [existing?.trimEnd(), ...lines].filter(Boolean).join("\n");
}

/** A netrc that gives Nix the token as the password for the server. */
export function netrc(server: string, token: string): string {
	return `machine ${new URL(server).hostname}\npassword ${token}\n`;
}

/**
 * The store paths a job added: those not there before it, without
 * derivations, which no one substitutes, and without what `exclude` matches.
 */
export function newStorePaths(before: ReadonlySet<string>, after: readonly string[], exclude?: RegExp): string[] {
	return after
		.filter((p) => !before.has(p) && !p.endsWith(".drv") && !exclude?.test(p))
		.sort();
}

/**
 * Splits store paths into argument lists that stay well under the kernel's
 * limit on a command line.
 */
export function batches(paths: readonly string[], maxBytes = 512 * 1024): string[][] {
	const out: string[][] = [];
	let current: string[] = [];
	let size = 0;
	for (const p of paths) {
		if (current.length > 0 && size + p.length + 1 > maxBytes) {
			out.push(current);
			current = [];
			size = 0;
		}
		current.push(p);
		size += p.length + 1;
	}
	if (current.length > 0) out.push(current);
	return out;
}
