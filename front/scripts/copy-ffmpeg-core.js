#!/usr/bin/env node
/**
 * Copies the FFmpeg UMD bundle from node_modules/@ffmpeg/core/dist/umd/ into
 * front/public/ffmpeg/ so the browser can load ffmpeg-core.{js,wasm} same-
 * origin. Runs automatically after `pnpm install`.
 *
 * Why: the previous setup fetched ffmpeg-core from unpkg at runtime under
 * COEP require-corp — a single CDN failure silently dropped the video.
 * Vendoring would bloat the repo (32 MB of WASM). postinstall is the honest
 * trade-off: dependency pinned in package.json, binaries generated on install.
 *
 * Expected SHA-256 (update this when bumping @ffmpeg/core):
 *   ffmpeg-core.js   : <run `sha256sum front/public/ffmpeg/ffmpeg-core.js` after first install>
 *   ffmpeg-core.wasm : <run `sha256sum front/public/ffmpeg/ffmpeg-core.wasm` after first install>
 *
 * Deploy smoke-check:
 *   fetch('/ffmpeg/ffmpeg-core.wasm') → 200 OK with Content-Type application/wasm
 */

const fs = require('node:fs')
const path = require('node:path')

const here = __dirname
const repoRoot = path.resolve(here, '..', '..')
const srcDir = path.join(
  repoRoot,
  'node_modules',
  '.pnpm',
  // Find whichever @ffmpeg/core+<version> directory pnpm installed.
  fs.readdirSync(path.join(repoRoot, 'node_modules', '.pnpm'))
    .find((d) => d.startsWith('@ffmpeg+core@')) || '@ffmpeg+core@0.12.6',
  'node_modules',
  '@ffmpeg',
  'core',
  'dist',
  'umd',
)
const destDir = path.join(here, '..', 'public', 'ffmpeg')

const FILES = ['ffmpeg-core.js', 'ffmpeg-core.wasm']

if (!fs.existsSync(srcDir)) {
  console.error('[postinstall-ffmpeg] source dir not found:', srcDir)
  console.error('[postinstall-ffmpeg] skipping — run `pnpm install` to regenerate.')
  process.exit(0)
}

fs.mkdirSync(destDir, { recursive: true })

for (const file of FILES) {
  const src = path.join(srcDir, file)
  const dest = path.join(destDir, file)
  if (!fs.existsSync(src)) {
    console.error(`[postinstall-ffmpeg] missing ${src}`)
    process.exit(1)
  }
  fs.copyFileSync(src, dest)
  console.log(`[postinstall-ffmpeg] copied ${file} → public/ffmpeg/${file}`)
}
