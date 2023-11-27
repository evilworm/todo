import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import IORedis from 'ioredis';
import { REDIS_HOST, REDIS_PORT } from '../constants';

export const IO_REDIS = 'IO_REDIS';

export const ioRedisClientFactory: FactoryProvider<IORedis> = {
  provide: IO_REDIS,
  useFactory: async (configService: ConfigService) => {
    const host = configService.get<string>(REDIS_HOST, 'localhost');
    const port = parseInt(configService.get<string>(REDIS_PORT, '6379'), 10);
    const redisClient = new IORedis({
      host,
      port,
    });

    ['ready', 'reconnecting', 'error', 'warning'].forEach((event) => {
      redisClient.on(event, () => {
        Sentry.addBreadcrumb({
          category: 'ioredis',
          message: event,
        });
      });

      redisClient.on('connect', () => {
        Sentry.addBreadcrumb({
          category: 'ioredis',
          message: 'connect ' + host + ':' + port,
        });
      });

      redisClient.on('end', () => {
        Sentry.addBreadcrumb({
          category: 'ioredis',
          message: 'end ' + host + ':' + port,
        });
      });
    });

    await new Promise((resolve) => {
      redisClient.connect(() => {
        resolve(true);
      });
    });

    return redisClient;
  },
  inject: [ConfigService],
};
