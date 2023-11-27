import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryService {
  constructor(private config: ConfigService) {}

  captureException(error: Error): void {
    Sentry.captureException(error);
  }
}
