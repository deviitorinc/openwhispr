#!/usr/bin/env node
/**
 * Stage QA prebuilt / native macOS binaries for GitHub Actions cache.
 *
 * Usage:
 *   node scripts/ci-qa-binary-cache.js versions
 *   node scripts/ci-qa-binary-cache.js import-prebuilt <stagingDir> <arch>
 *   node scripts/ci-qa-binary-cache.js export-prebuilt <stagingDir> <arch>
 *   node scripts/ci-qa-binary-cache.js import-native <stagingDir>
 *   node scripts/ci-qa-binary-cache.js export-native <stagingDir>
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BIN_DIR = path.join(ROOT, "resources", "bin");

const NATIVE_ENTRIES = [
  "macos-globe-listener",
  "macos-fast-paste",
  "macos-text-monitor",
  "macos-media-remote",
  "macos-audio-tap",
  "macos-mic-listener",
  "macos-calendar-listener",
  "macos-disclaim-exec",
  "MediaRemoteAdapter.framework",
];

function usage() {
  console.error(`Usage:
  node scripts/ci-qa-binary-cache.js versions
  node scripts/ci-qa-binary-cache.js import-prebuilt <stagingDir> <arch>
  node scripts/ci-qa-binary-cache.js export-prebuilt <stagingDir> <arch>
  node scripts/ci-qa-binary-cache.js import-native <stagingDir>
  node scripts/ci-qa-binary-cache.js export-native <stagingDir>`);
  process.exit(1);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyEntry(source, dest) {
  if (!fs.existsSync(source)) {
    return false;
  }

  if (fs.existsSync(dest)) {
    const resolvedSource = fs.realpathSync(source);
    const resolvedDest = fs.realpathSync(dest);
    if (resolvedSource === resolvedDest) {
      return false;
    }
  }

  ensureDir(path.dirname(dest));
  fs.cpSync(source, dest, { recursive: true, force: true, dereference: true });
  return true;
}

function listBinEntries() {
  if (!fs.existsSync(BIN_DIR)) {
    return [];
  }

  return fs.readdirSync(BIN_DIR, { withFileTypes: true }).map((entry) => entry.name);
}

function isPrebuiltEntry(name, arch) {
  const darwinArch = `darwin-${arch}`;

  if (name === "whisper-vad") {
    return true;
  }

  if (name.startsWith(`whisper-server-${darwinArch}`)) return true;
  if (name.startsWith(`llama-server-${darwinArch}`)) return true;
  if (name.startsWith(`qdrant-${darwinArch}`)) return true;
  if (name.startsWith(`yt-dlp-${darwinArch}`)) return true;
  if (name.startsWith(`meeting-aec-helper-${darwinArch}`)) return true;
  if (name.startsWith(`sherpa-onnx-`) && name.includes(darwinArch)) return true;

  if (/^lib(ggml|llama|mtmd|onnxruntime|sherpa-onnx)/.test(name)) {
    return true;
  }

  return false;
}

function prebuiltEntries(arch) {
  return listBinEntries().filter((name) => isPrebuiltEntry(name, arch));
}

function importEntries(stagingDir, entries) {
  if (!fs.existsSync(stagingDir)) {
    return 0;
  }

  ensureDir(BIN_DIR);
  let imported = 0;

  for (const name of entries) {
    const source = path.join(stagingDir, name);
    const dest = path.join(BIN_DIR, name);
    if (copyEntry(source, dest)) {
      imported += 1;
    }
  }

  return imported;
}

function exportEntries(stagingDir, entries) {
  ensureDir(stagingDir);
  let exported = 0;

  for (const name of entries) {
    const source = path.join(BIN_DIR, name);
    const dest = path.join(stagingDir, name);
    if (copyEntry(source, dest)) {
      exported += 1;
    }
  }

  return exported;
}

function main() {
  const [command, stagingDir, arch] = process.argv.slice(2);

  if (command === "versions") {
    require("child_process").execFileSync("node", [path.join(__dirname, "ci-qa-cache-versions.js")], {
      stdio: "inherit",
    });
    return;
  }

  if (!command || !stagingDir) {
    usage();
  }

  switch (command) {
    case "import-prebuilt": {
      if (!arch) usage();
      const imported = importEntries(stagingDir, prebuiltEntries(arch));
      console.log(`[qa-binary-cache] imported ${imported} prebuilt entr${imported === 1 ? "y" : "ies"} for ${arch}`);
      break;
    }
    case "export-prebuilt": {
      if (!arch) usage();
      const exported = exportEntries(stagingDir, prebuiltEntries(arch));
      console.log(`[qa-binary-cache] exported ${exported} prebuilt entr${exported === 1 ? "y" : "ies"} for ${arch}`);
      break;
    }
    case "import-native": {
      const imported = importEntries(stagingDir, NATIVE_ENTRIES);
      console.log(`[qa-binary-cache] imported ${imported} native entr${imported === 1 ? "y" : "ies"}`);
      break;
    }
    case "export-native": {
      const exported = exportEntries(stagingDir, NATIVE_ENTRIES);
      console.log(`[qa-binary-cache] exported ${exported} native entr${exported === 1 ? "y" : "ies"}`);
      break;
    }
    default:
      usage();
  }
}

main();
