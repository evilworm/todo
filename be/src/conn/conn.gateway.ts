import { ConsoleLogger, UseFilters } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import * as Sentry from '@sentry/node';
import { Subject, filter } from 'rxjs';
import { Socket } from 'socket.io-client';
import { Client } from './client';
import { ConnExceptionFilter } from './conn.exception-filter';
import { MessageWithType } from './conn.interface';

@WebSocketGateway()
export class ConnGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new ConsoleLogger(ConnGateway.name);
  private messages = new Subject<MessageWithType>();
  private clientDisconnect = new Subject<Client>();
  private clients = new Map<string, Client>();

  handleConnection(socket: Socket, ...args: any[]) {
    Sentry.addBreadcrumb({
      message: 'Client connected',
      data: {
        id: socket.id,
      },
    });
    this.clients.set(socket.id, new Client(socket));
  }

  handleDisconnect(socket: Socket) {
    Sentry.addBreadcrumb({
      message: 'Client disconnected',
      data: {
        id: socket.id,
      },
    });
    const client = this.clients.get(socket.id);
    if (client) {
      this.clientDisconnect.next(client);
    }
    this.clients.delete(socket.id);
  }

  @UseFilters(ConnExceptionFilter)
  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: any,
  ): void {
    this.messages.next({
      type: payload.type,
      id: payload.id,
      client: this.clients.get(socket.id),
      data: payload.data,
    });
  }

  onMessage(type: string, callback: (message: MessageWithType) => void) {
    return this.messages
      .pipe(filter((m) => m.type == type))
      .subscribe(callback);
  }

  onClientDisconnect(callback: (client: Client) => void) {
    return this.clientDisconnect.subscribe(callback);
  }
}
