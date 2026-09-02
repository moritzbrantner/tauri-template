# Cancellable background jobs

Use this when an application starts work that outlives a single frontend interaction: imports, media processing, indexing, exports, model execution, or other long-running native operations.

This recipe is intentionally not a Tauri plugin dependency. The durable part is the job model; Tauri should only transport commands and progress events.

## Core model

Put job lifecycle state in a reusable Rust crate, for example `src-tauri/crates/app-core/src/jobs.rs`. A useful minimal contract is:

```rust
pub enum JobState {
    Queued,
    Running { progress: f32 },
    Completed,
    Cancelled,
    Failed { message: String },
}
```

The core should own:

- stable job IDs;
- legal state transitions;
- cancellation intent;
- progress values and terminal state;
- cleanup/retention policy.

Do not make the core depend on `tauri::AppHandle` or window labels.

## Tauri adapter

The Tauri layer may expose commands such as:

- `start_job`
- `cancel_job`
- `job_status`
- `list_jobs`
- `clear_finished_jobs`

Translate core progress into versioned events such as `job://progress`. Keep the serialized event payload small and deterministic. A restarted or closed frontend should be able to query current state instead of relying exclusively on events it may have missed.

Prefer async tasks for async work and `spawn_blocking`/an appropriate worker mechanism for CPU-bound blocking work. Cancellation must be cooperative and checked at meaningful boundaries; dropping a frontend listener is not cancellation.

## Frontend adapter

Create a service under `src/platform/tauri/jobs.ts` that owns invoke/listen calls and returns cleanup handles. React components consume that service, not raw Tauri event names.

## Tests

- Unit-test the job state machine in pure Rust.
- Verify cancellation is idempotent.
- Verify progress cannot regress or appear after terminal completion unless the domain explicitly permits it.
- Native-test command/event serialization.
- Exercise frontend remount/reconnect by querying job state after intentionally missing events.

The previous template's `jobs.rs` remains in Git history as extraction material, but this recipe deliberately keeps its application-independent lifecycle idea rather than copying its global state implementation wholesale.
