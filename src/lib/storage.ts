export function readStorageJson<T>(key: string, fallback: T, isValid?: (value: unknown) => value is T): T {
  try {
    const saved = window.localStorage.getItem(key);
    if (saved === null) return fallback;
    const parsed: unknown = JSON.parse(saved);
    if (isValid && !isValid(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeStorageJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}
