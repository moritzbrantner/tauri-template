#!/usr/bin/env bash
set -euo pipefail

for command in bun curl jq tauri-driver; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "native runtime smoke requires $command" >&2
    exit 1
  fi
done

package_name="$(jq -r '.name' package.json)"
if [[ -z "$package_name" || "$package_name" == "null" ]]; then
  echo "package.json does not declare an application name" >&2
  exit 1
fi

app_binary="${TAURI_APP_BINARY:-$PWD/src-tauri/target/release/$package_name}"
if [[ ! -x "$app_binary" ]]; then
  echo "native runtime smoke expected executable at $app_binary" >&2
  exit 1
fi

driver_log="$(mktemp)"
driver_pid=""
session_id=""

cleanup() {
  if [[ -n "$session_id" ]]; then
    curl -sS -X DELETE "http://127.0.0.1:4444/session/$session_id" >/dev/null 2>&1 || true
  fi
  if [[ -n "$driver_pid" ]]; then
    kill "$driver_pid" >/dev/null 2>&1 || true
    wait "$driver_pid" >/dev/null 2>&1 || true
  fi
  rm -f "$driver_log"
}
trap cleanup EXIT

tauri-driver --port 4444 --native-port 4445 >"$driver_log" 2>&1 &
driver_pid="$!"

ready=false
for _ in $(seq 1 30); do
  if ! kill -0 "$driver_pid" >/dev/null 2>&1; then
    cat "$driver_log" >&2
    echo "tauri-driver exited before becoming ready" >&2
    exit 1
  fi
  if curl -fsS "http://127.0.0.1:4444/status" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 0.5
done
if [[ "$ready" != true ]]; then
  cat "$driver_log" >&2
  echo "tauri-driver did not become ready" >&2
  exit 1
fi

session_payload="$(
  jq -cn --arg application "$app_binary" '{
    capabilities: {
      alwaysMatch: {
        browserName: "wry",
        "tauri:options": {
          application: $application,
          webviewOptions: {}
        }
      },
      firstMatch: [{}]
    }
  }'
)"
session_response=""
for _ in $(seq 1 12); do
  session_response="$(
    curl -sS \
      -H 'content-type: application/json' \
      -X POST \
      --data "$session_payload" \
      "http://127.0.0.1:4444/session" || true
  )"
  session_id="$(jq -r '.value.sessionId // .sessionId // empty' <<<"$session_response" 2>/dev/null || true)"
  if [[ -n "$session_id" ]]; then
    break
  fi
  sleep 0.5
done
if [[ -z "$session_id" ]]; then
  cat "$driver_log" >&2
  echo "failed to create Tauri WebDriver session: $session_response" >&2
  exit 1
fi

find_element() {
  local selector="$1"
  local payload response element_id
  payload="$(jq -cn --arg selector "$selector" '{using: "css selector", value: $selector}')"
  response="$(
    curl -fsS \
      -H 'content-type: application/json' \
      -X POST \
      --data "$payload" \
      "http://127.0.0.1:4444/session/$session_id/element"
  )"
  element_id="$(jq -r '.value["element-6066-11e4-a52e-4f735466cecf"] // .value.ELEMENT // empty' <<<"$response")"
  if [[ -z "$element_id" ]]; then
    echo "failed to find $selector: $response" >&2
    exit 1
  fi
  printf '%s' "$element_id"
}

button_id="$(find_element 'button[type="submit"]')"
curl -fsS \
  -H 'content-type: application/json' \
  -X POST \
  --data '{}' \
  "http://127.0.0.1:4444/session/$session_id/element/$button_id/click" >/dev/null

output_id="$(find_element 'output.status')"
expected="Hello, World! You've been greeted from Rust!"
actual=""
for _ in $(seq 1 20); do
  text_response="$(
    curl -fsS "http://127.0.0.1:4444/session/$session_id/element/$output_id/text"
  )"
  actual="$(jq -r '.value // empty' <<<"$text_response")"
  if [[ "$actual" == "$expected" ]]; then
    break
  fi
  sleep 0.25
done

if [[ "$actual" != "$expected" ]]; then
  cat "$driver_log" >&2
  echo "native IPC smoke expected '$expected' but got '$actual'" >&2
  exit 1
fi

printf 'native Tauri IPC smoke passed for %s\n' "$package_name"
