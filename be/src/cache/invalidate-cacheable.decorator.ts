// cacheable.decorator.ts
import { Inject } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { CacheService } from './cache.service';

export type CacheableKeyBuilder = (args: any[], context?: any) => any;

export interface CacheableOptions {
  key: string | CacheableKeyBuilder;
  ttl?: number;
}

export function InvalidateCacheable<T>(options: CacheableOptions) {
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

        const cacheKey =
          options?.key instanceof Function
            ? options.key(args, this)
            : options?.key;

        try {
          Sentry.addBreadcrumb({
            category: 'cache',
            message: 'invalidate cache: ' + cacheKey,
          });
          await cacheService.invalidate(cacheKey);
        } catch (error) {
          Sentry.captureException(error);
        }

        return descriptor.value.apply(this, args);
      },
    };
  };
}
