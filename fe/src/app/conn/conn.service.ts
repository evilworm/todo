import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Subject,
  catchError,
  filter,
  map,
  mergeMap,
  of,
  take,
  throwError,
  timeout,
} from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { ETIMEDOUT } from '../../constants';
import { environment } from '../../environments/environment';
import { ErrorWithCode } from '../error';
import { TodoItem } from '../todo/todo.interface';
import {
  DeleteItemResponse,
  ErrorMessage,
  Message,
  SaveItemResponse,
} from './conn.interface';

@Injectable({
  providedIn: 'root',
})
export class ConnService {
  private _socket: Socket | null = null;
  private _connectionState = new BehaviorSubject<boolean>(false);
  private _messages = new Subject<Message | ErrorMessage>();

  constructor() {
    this._socket = io(environment.wsUrl, {
      transports: ['websocket'],
      reconnectionDelay: 3000,
      reconnectionDelayMax: 5000,
      timeout: 3000,
      autoConnect: true,
      reconnection: true,
    });

    this._socket.on('connect', () => {
      this._connectionState.next(true);
    });

    this._socket.on('error', () => {
      // TODO: handle errors
    });

    this._socket.on('disconnect', (err: string) => {
      this._connectionState.next(false);
    });

    this._socket.on('message', (data: any) => {
      this._messages.next(data);
    });
  }

  get connectionState$() {
    return this._connectionState.asObservable();
  }

  messagesByType<T>(type: string) {
    return this._messages.asObservable().pipe(
      filter(
        (payload): payload is Message =>
          payload.type !== 'error' && payload.type === type
      ),
      map((payload) => payload?.data as T)
    );
  }

  messageById(id: string) {
    return this._messages.asObservable().pipe(
      filter((payload) => payload?.id == id),
      mergeMap((payload) => {
        if (payload.type === 'error') {
          const errorMessage = payload as ErrorMessage;
          return throwError(
            () =>
              new ErrorWithCode(
                errorMessage.error.message,
                errorMessage.error.code
              )
          );
        } else {
          return of(payload as Message);
        }
      }),
      catchError((err) => {
        return throwError(() => err);
      })
    );
  }

  sendMessage(type: string, data?: any): string {
    if (!this._socket) {
      throw new Error('Not connected to server!');
    }

    const id = uuidv4();
    this._socket.emit('message', {
      id,
      type,
      data,
    });

    return id;
  }

  sendMessageWithResponse<T>(
    type: string,
    handler: { response: (response: T) => void; error: (error: Error) => void },
    data?: any
  ): void {
    const id = this.sendMessage(type, data);

    this.messageById(id)
      .pipe(
        take(1),
        timeout({
          each: 3000,
          with: () =>
            throwError(
              () => new ErrorWithCode('Timeout has occured', ETIMEDOUT)
            ),
        })
      )
      .subscribe({
        next: (response) => {
          handler.response(response.data);
        },
        error: (e) => {
          handler.error(e);
        },
      });
  }

  sendMessageWithResponsePromise<T>(type: string, data?: any) {
    return new Promise<T>((resolve, reject) => {
      this.sendMessageWithResponse<T>(
        type,
        {
          response: (response) => {
            resolve(response);
          },
          error: (error) => {
            reject(error);
          },
        },
        data
      );
    });
  }

  async saveItem(data: { uuid: string; index: number; item?: TodoItem }) {
    const result = await this.sendMessageWithResponsePromise<SaveItemResponse>(
      'saveItem',
      data
    );
    return result.id;
  }

  async deleteItem(data: { uuid: string; item: TodoItem }) {
    const result =
      await this.sendMessageWithResponsePromise<DeleteItemResponse>(
        'deleteItem',
        data
      );
    return result.id;
  }
}
