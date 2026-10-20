# Snowstead action

Substitute from a [Snowstead](https://snowstead.com) cache in CI, and push
what the job builds to it.

```yaml
steps:
  - uses: actions/checkout@v5
  - uses: DeterminateSystems/nix-installer-action@main
  - uses: Polymath-AS/snowstead-action@v1
    with:
      name: mycache
      authToken: "${{ secrets.SNOWSTEAD_AUTH_TOKEN }}"
  - run: nix build
```

From the action's step on, Nix substitutes from `mycache`. When the job ends,
even when it fails, the store paths it built are pushed. Paths the cache
already has, and paths cache.nixos.org serves, are skipped by the server.

Create the token with push permission for the cache:

```sh
snowstead token create github-ci --caches mycache --perms push
```

and store it as the repository secret `SNOWSTEAD_AUTH_TOKEN`. Pull requests
from forks get no secrets: their jobs substitute from public caches and
push nothing.

## Inputs

| Input | Default | |
|---|---|---|
| `name` | | The cache. Required. |
| `authToken` | | A token for the cache. With `push` the job's paths are pushed; with `pull` a private cache can be read. Without one, the cache is only substituted from. |
| `private` | `false` | The cache is private: reading it needs the token's `pull` permission. |
| `skipPush` | `false` | Substitute only. |
| `pathsToPush` | | Store paths or installables whose closures to push, instead of every path the job built. |
| `pushFilter` | | A regular expression; matching store paths are not pushed. |
| `jobs` | `32` | Store paths in flight while pushing. |
| `server` | `https://cache.snowstead.com` | The Snowstead server. |
| `publicKey` | `snowstead-1:rkNwHb7…` | The key the server signs with. |
| `cli` | `github:Polymath-AS/snowstead` | The flake of the Snowstead CLI that pushes. |

Nix must be installed first, and the runner's user must be trusted by the
Nix daemon, which the usual installers set up.

## How it works

The action's step adds the cache to `NIX_CONFIG` as an extra substituter
with its signing key (and, for a private cache, a netrc holding the token),
so later steps substitute from it. When the job will push, it builds the
CLI and records the store's paths. Its post step lists the store again,
leaves out derivations and what `pushFilter` matches, and pushes the
rest with `snowstead push`.

## Development

```sh
pnpm install
pnpm check   # types and tests
pnpm build   # bundles src/ into dist/, which is committed
```
