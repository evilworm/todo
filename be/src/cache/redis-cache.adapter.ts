import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import * as IORedis from 'ioredis';
import { CacheService } from './cache.interface';
import { IO_REDIS } from './ioredis.factory';

@Injectable()
export class RedisCacheAdapter implements CacheService, OnModuleDestroy {
  private client: IORedis.Redis;

  constructor(@Inject(IO_REDIS) private readonly redisClient: IORedis.Redis) {}

  async onModuleDestroy(): Promise<any> {
    await this.client.quit();
  }

  async get(key: string): Promise<any | null> {
    return new Promise((resolve, reject) => {
      this.client.get(key, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result ? JSON.parse(result) : null);
        }
      });
    });
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        this.client.setex(key, ttl, stringValue, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } else {
        this.client.set(key, stringValue, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }
    });
  }

  async invalidate(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.del(key, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}
