import { Module } from '@nestjs/common';
import { SentryModule } from '../sentry/sentry.module';
import { ConnExceptionFilter } from './conn.exception-filter';
import { ConnGateway } from './conn.gateway';

@Module({
  imports: [SentryModule],
  providers: [
    ConnGateway,
    {
      provide: 'APP_FILTER',
      useClass: ConnExceptionFilter,
    },
  ],
  exports: [ConnGateway],
})
export class ConnModule {}
