# FFmpeg Core (local bundle)

Same-origin copy of `@ffmpeg/core@0.12.6` UMD build so the client never hits an
external CDN at runtime (the previous unpkg fetch silently dropped the video
under COEP `require-corp` if the request failed).

## How these files get here

`front/scripts/copy-ffmpeg-core.js` runs on `pnpm install` (via the
`postinstall` hook in `front/package.json`) and copies the UMD bundle from
`node_modules/@ffmpeg/core/dist/umd/` into this directory.

Do **not** commit the binaries — they are `.gitignore`d. The README is the
only tracked file.

## Refresh after upgrade

When bumping `@ffmpeg/core` in `package.json`:

```bash
pnpm install        # triggers postinstall → copies the new binaries
# then update the SHA-256 checksums below:
sha256sum front/public/ffmpeg/ffmpeg-core.js
sha256sum front/public/ffmpeg/ffmpeg-core.wasm
```

## SHA-256 checksums (pinned 0.12.6)

- `ffmpeg-core.js`   — `a34873964b0f62aec516bac75e3aa9086ec3535d4d07f0269aa94ea748b6cb71`
- `ffmpeg-core.wasm` — `2390efa7fb66e7e42dbae15427571a5ffc96b829480904c30f471f0a78967f61`

## Deploy smoke-check

Confirm the WASM file is reachable before accepting a deploy:

```bash
curl -sI https://<host>/ffmpeg/ffmpeg-core.wasm | grep -E 'HTTP|Content-Type'
# Expect: 200 / application/wasm
```

## Sizes

- `ffmpeg-core.js`  — ~114 KB loader
- `ffmpeg-core.wasm` — ~30 MB WebAssembly binary (loaded on first transcode)
