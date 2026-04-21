import { invoke } from "@tauri-apps/api/core";

export async function greet(name: string) {
  return invoke<string>("greet", { name });
}
