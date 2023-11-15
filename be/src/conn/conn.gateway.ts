import { ConsoleLogger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { Subject, filter } from 'rxjs';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { ErrorWithCode } from '../error';
import { MessageWithType } from './conn.interface';

@WebSocketGateway()
export class ConnGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new ConsoleLogger(ConnGateway.name);
  private messages = new Subject<MessageWithType>();
  private clientDisconnect = new Subject<Socket>();

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.clientDisconnect.next(client);
  }

  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ): void {
    this.messages.next({
      type: payload.type,
      id: payload.id,
      socket: client,
      data: payload.data,
    });
  }

  sendMessage(client: Socket, type: string, data: any, id?: string) {
    if (!id) {
      id = uuidv4();
    }
    try {
      client.emit('message', {
        id,
        type,
        data,
      });
    } catch (e) {
      this.logger.error('Gateway error: ', e);
    }
  }

  sendErrorMessage(client: Socket, error: ErrorWithCode, id?: string) {
    if (!id) {
      id = uuidv4();
    }

    try {
      client.emit('message', {
        id,
        type: 'error',
        error: {
          message: error.message,
          code: error.code,
        },
      });
    } catch (e) {
      this.logger.error('Gateway error: ', e);
    }
  }

  onMessage(type: string, callback: (message: MessageWithType) => void) {
    return this.messages
      .pipe(filter((m) => m.type == type))
      .subscribe(callback);
  }

  onClientDisconnect(callback: (client: Socket) => void) {
    return this.clientDisconnect.subscribe(callback);
  }
}
