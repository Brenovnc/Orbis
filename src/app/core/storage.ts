// Everything is saved only in this browser (localStorage). Reads and writes never throw:
// private windows or blocked storage just behave as "nothing saved".
const PREFIX = 'orbis:v1:';

export function readStore<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeStore(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the game still works, it just won't be remembered.
  }
}

export function removeStore(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // Nothing to do.
  }
}
