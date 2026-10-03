# Example apps

Optional, focused applications that demonstrate how to grow the minimal Tauri template without expanding its default runtime.

- [`guitar-tuner`](./guitar-tuner): captures microphone audio in the WebView, sends bounded PCM windows across a typed Tauri command, and performs pitch/tuning analysis in reusable Rust.

Each example owns its application-specific dependencies and permissions. Nothing under `examples/` is required by projects generated from the template.
