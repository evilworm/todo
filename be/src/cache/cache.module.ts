// cache.module.ts
import { Global, Module } from '@nestjs/common';

import { CacheService } from './cache.service';
import { ioRedisClientFactory } from './ioredis.factory';
import { MemoryCacheAdapter } from './memory-cache.adapter';
import { RedisCacheAdapter } from './redis-cache.adapter';

@Global()
@Module({
  providers: [
    CacheService,
    MemoryCacheAdapter,
    RedisCacheAdapter,
    ioRedisClientFactory,
  ],
  exports: [CacheService],
})
export class CacheModule {}
