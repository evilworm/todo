import { Socket } from 'socket.io-client';

export interface MessageWithType {
  type: string;
  id: string;
  socket: Socket;
  data?: any;
}
