#!/usr/bin/env node
/**
 * Emits a stable string for GitHub Actions prebuilt-binary cache keys.
 * Run: node scripts/ci-qa-cache-versions.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function readConst(relativePath, pattern, label) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Could not read ${label} from ${relativePath}`);
  }
  return match[1];
}

const versions = {
  whisper: readConst(
    "scripts/download-whisper-cpp.js",
    /WHISPER_CPP_TAG = process\.env\.WHISPER_CPP_VERSION \|\| "([^"]+)"/,
    "WHISPER_CPP_TAG"
  ),
  llama: readConst(
    "scripts/download-llama-server.js",
    /LLAMA_CPP_TAG = process\.env\.LLAMA_CPP_VERSION \|\| "([^"]+)"/,
    "LLAMA_CPP_TAG"
  ),
  sherpa: readConst(
    "scripts/download-sherpa-onnx.js",
    /SHERPA_ONNX_VERSION = "([^"]+)"/,
    "SHERPA_ONNX_VERSION"
  ),
  ytdlp: readConst("scripts/download-yt-dlp.js", /YT_DLP_VERSION = "([^"]+)"/, "YT_DLP_VERSION"),
  whisperVad: "ggml-silero-v5.1.2.bin",
  meetingAec: readConst(
    "scripts/download-meeting-aec-helper.js",
    /TAG_PREFIX = "([^"]+)"/,
    "meeting-aec TAG_PREFIX"
  ),
  qdrant: readConst(
    "scripts/download-qdrant.js",
    /const QDRANT_REPO = "([^"]+)"/,
    "QDRANT_REPO"
  ),
};

const key = Object.entries(versions)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, value]) => `${name}=${value}`)
  .join(";");

process.stdout.write(key);
