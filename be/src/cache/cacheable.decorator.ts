// cacheable.decorator.ts
import { Inject } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { CacheService } from './cache.service';

export type CacheableKeyBuilder = (args: any[], context?: any) => any;

export interface CacheableOptions {
  key: string | CacheableKeyBuilder;
  ttl?: number;
}

export function Cacheable<T>(options: CacheableOptions) {
  const cacheServiceInjector = Inject(CacheService);
  const ttl = options?.ttl ?? 10 * 60; // default ttl 10 minutes

  return (
    target: Record<string, any>,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    cacheServiceInjector(target, '_cacheService');
    return {
      ...descriptor,
      async value(...args: any[]): Promise<any> {
        const cacheService = this._cacheService as CacheService;

        let cacheKey;
        try {
          cacheKey =
            options?.key instanceof Function
              ? options.key(args, this)
              : options?.key;
          const cachedData = await cacheService.get(cacheKey);

          if (cachedData) {
            Sentry.addBreadcrumb({
              category: 'cache',
              message: 'cache HIT: ' + cacheKey,
            });
            return cachedData;
          }
        } catch (error) {
          Sentry.captureException(error);
        }

        const result = await descriptor.value.apply(this, args);

        try {
          Sentry.addBreadcrumb({
            category: 'cache',
            message: 'cache MISS: ' + cacheKey,
          });
          await cacheService.set(cacheKey, result, ttl);
        } catch (error) {
          Sentry.captureException(error);
        }

        return result;
      },
    };
  };
}
