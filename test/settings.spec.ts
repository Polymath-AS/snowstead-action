import { describe, it, expect } from "vitest";
import { batches, netrc, newStorePaths, nixConfig, substituterUrl } from "../src/settings.js";

describe("substituter", () => {
	it("serves public caches at the root and private ones under /private/", () => {
		expect(substituterUrl("https://cache.snowstead.com/", "main", false)).toBe("https://cache.snowstead.com/main");
		expect(substituterUrl("https://cache.snowstead.com", "team", true)).toBe("https://cache.snowstead.com/private/team");
	});
});

describe("NIX_CONFIG", () => {
	const settings = { substituter: "https://cache.snowstead.com/main", publicKey: "snowstead-1:abc=" };

	it("adds the cache to what the job already set", () => {
		expect(nixConfig("max-jobs = 4\n", settings)).toBe(
			"max-jobs = 4\nextra-substituters = https://cache.snowstead.com/main\nextra-trusted-public-keys = snowstead-1:abc=",
		);
	});

	it("points Nix at the netrc for a private cache", () => {
		expect(nixConfig(undefined, { ...settings, netrcFile: "/tmp/netrc" })).toContain("netrc-file = /tmp/netrc");
	});
});

describe("netrc", () => {
	it("gives the token as the server's password", () => {
		expect(netrc("https://cache.snowstead.com:443/x", "tok")).toBe("machine cache.snowstead.com\npassword tok\n");
	});
});

describe("new store paths", () => {
	const before = new Set(["/nix/store/aaa-glibc"]);
	const after = ["/nix/store/aaa-glibc", "/nix/store/ccc-app", "/nix/store/bbb-app.drv", "/nix/store/ddd-source"];

	it("are the paths the job added, without derivations, sorted", () => {
		expect(newStorePaths(before, after)).toEqual(["/nix/store/ccc-app", "/nix/store/ddd-source"]);
	});

	it("leave out what the filter matches", () => {
		expect(newStorePaths(before, after, /-source$/)).toEqual(["/nix/store/ccc-app"]);
	});
});

describe("batches", () => {
	it("keep each command line under the limit, in order", () => {
		const paths = Array.from({ length: 10 }, (_, i) => `/nix/store/${String(i).repeat(32)}-p`);
		const split = batches(paths, 150);
		expect(split.flat()).toEqual(paths);
		expect(split.every((b) => b.join(" ").length < 150)).toBe(true);
		expect(split.length).toBeGreaterThan(1);
	});
});
