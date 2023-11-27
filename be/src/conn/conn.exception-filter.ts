import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { v4 as uuidv4 } from 'uuid';
import { EINTERNAL } from '../constants';
import { SentryService } from '../sentry/sentry.service';

@Catch()
export class ConnExceptionFilter extends BaseWsExceptionFilter {
  constructor(private readonly sentryService: SentryService) {
    super();
  }

  catch(error: Error, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient();
    this.sentryService.captureException(error);

    client.emit('message', {
      id: uuidv4(),
      type: 'error',
      error: {
        message:
          'There was an error processing your request, please try again.',
        code: EINTERNAL,
      },
    });

    client.disconnect();
  }
}
