import { invoke } from "@tauri-apps/api/core";

export async function getKey(key: number): Promise<string> {
  try {
    const message = await invoke('get_keys_config', { key });
    return message as string;
  } catch (error) {
    console.error('Failed to get key from Tauri backend', error);
    return '';
  }
}