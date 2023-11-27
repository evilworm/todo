import { Inject, Injectable } from '@nestjs/common';
import { SentryTransactionSpan } from '../conn/client-transaction-span.decorator';
import { CacheAdapter } from './cache-adapter.interface';
import { IO_REDIS } from './ioredis.factory';
import { MemoryCacheAdapter } from './memory-cache.adapter';
import { RedisCacheAdapter } from './redis-cache.adapter';

@Injectable()
export class CacheService {
  private adapter: CacheAdapter;

  constructor(
    private readonly memoryCacheAdapter: MemoryCacheAdapter,
    @Inject(IO_REDIS)
    ioredisCacheAdapter: RedisCacheAdapter | null,
  ) {
    this.adapter =
      process.env.CACHE_ADAPTER === 'redis'
        ? ioredisCacheAdapter
        : memoryCacheAdapter;
  }

  @SentryTransactionSpan({
    description: 'get item from cache',
    data: (args: any[]) => ({
      key: args[0],
    }),
  })
  async get(key: string): Promise<any | null> {
    return this.adapter.get(key);
  }

  @SentryTransactionSpan({
    description: 'set item in cache',
    data: (args: any[]) => ({
      key: args[0],
    }),
  })
  async set(key: string, value: any, ttl?: number): Promise<void> {
    return this.adapter.set(key, value, ttl);
  }

  @SentryTransactionSpan({
    description: 'invalidate item in cache',
    data: (args: any[]) => ({
      key: args[0],
    }),
  })
  async invalidate(key: string): Promise<void> {
    return this.adapter.invalidate(key);
  }
}
