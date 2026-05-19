export const storageService = {
  read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }

      return JSON.parse(raw) as T;
    } catch (error) {
      console.error(`Failed to read key "${key}" from storage`, error);
      return fallback;
    }
  },
  write<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Failed to write key "${key}" to storage`, error);
      return false;
    }
  }
};

