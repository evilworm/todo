import { ConsoleLogger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { Socket } from 'socket.io-client';
import { inspect } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { SentryTransactionSpan } from '../conn/client-transaction-span.decorator';
import { ErrorWithCode } from '../error';

export class Client {
  private logger = new ConsoleLogger(Client.name);
  private transaction: Sentry.Transaction;

  constructor(private socket: Socket) {}

  get id() {
    return this.socket.id;
  }

  @SentryTransactionSpan({
    description: 'sendMessage',
    data: (args: any[]) => ({
      type: args[0],
      data: inspect(args[1], true, 10, false),
    }),
  })
  sendMessage(type: string, data: any, id?: string) {
    if (!id) {
      id = uuidv4();
    }
    this.socket.emit('message', {
      id,
      type,
      data,
    });
  }

  @SentryTransactionSpan({
    description: 'WS Error',
  })
  sendErrorMessage(error: ErrorWithCode, id?: string) {
    if (!id) {
      id = uuidv4();
    }

    this.socket.emit('message', {
      id,
      type: 'error',
      error: {
        message: error.message,
        code: error.code,
      },
    });
  }
}
