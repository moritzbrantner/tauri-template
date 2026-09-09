# Guitar tuner example

A small Tauri 2 guitar tuner that keeps microphone capture at the WebView boundary and performs pitch analysis in Rust.

## Architecture

1. `src/audio/microphone.ts` requests microphone permission and captures short in-memory PCM windows with the Web Audio API. Audio is never persisted or uploaded.
2. `src/platform/tauri/tuner.ts` is the only frontend IPC adapter.
3. `src-tauri/src/lib.rs` bounds the IPC payload and delegates immediately to `guitar-tuner-core`.
4. `src-tauri/crates/guitar-tuner-core` owns standard-tuning semantics and consumes `moenarch-audio-analysis-pitch` at merged audio-analysis revision `59bf3279811ac36e44139ffb092a979e4bfdaf24` (PR #83).

The core checks standard E2–A2–D3–G3–B3–E4 tuning, reports cents from the nearest string, and treats ±5 cents as in tune.

## Run

From this directory:

```bash
bun install --frozen-lockfile
bun run tauri dev
```

The repository pins Bun to 1.4.0 and Rust to 1.98.0. On Linux, install the same WebKit/GTK development packages used by the template validation workflow.

On macOS, `src-tauri/Info.plist` supplies the microphone usage description required for the system permission prompt.

## Verification

The path-scoped `Guitar tuner example` workflow builds the frontend and runs Rust formatting, Clippy, and tests. Its Rust consumer test uses a harmonic-rich low E where the second harmonic is stronger than the fundamental, so the example exercises the shared pitch-selection improvement instead of merely compiling against it.
