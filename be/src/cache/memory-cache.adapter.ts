// memory.cache.adapter.ts
import { Injectable } from '@nestjs/common';
import { CacheAdapter } from './cache-adapter.interface';

@Injectable()
export class MemoryCacheAdapter implements CacheAdapter {
  private cache: Map<string, any> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  async get(key: string): Promise<any | null> {
    return this.cache.get(key) || null;
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    this.cache.set(key, value);

    // Clear existing timer, if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    // Set a new timer if TTL is provided
    if (ttl) {
      const timer = setTimeout(() => {
        this.cache.delete(key);
        this.timers.delete(key);
      }, ttl * 1000);

      // Save the timer reference
      this.timers.set(key, timer);
    }
  }

  async invalidate(key: string): Promise<void> {
    // Clear existing timer, if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }

    this.cache.delete(key);
  }
}
