import { SearchResult } from "./types";

interface CacheEntry<T> {
  data: SearchResult<T>;
  expiry: number;
}

export class QueryCache {
  private static instance: QueryCache;
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.cache = new Map();
  }

  static getInstance(): QueryCache {
    if (!QueryCache.instance) {
      QueryCache.instance = new QueryCache();
    }
    return QueryCache.instance;
  }

  get<T>(key: string): SearchResult<T> | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(
    key: string,
    data: SearchResult<T>,
    ttl: number = this.defaultTTL
  ): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }

  generateKey(index: string, query: any): string {
    const queryString = JSON.stringify(query);
    return `${index}:${queryString}`;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  startCleanupInterval(interval: number = 60 * 1000): NodeJS.Timeout {
    return setInterval(() => this.cleanup(), interval);
  }
}
