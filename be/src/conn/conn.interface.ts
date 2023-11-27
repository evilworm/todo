import { Client } from './client';

export interface MessageWithType {
  type: string;
  id: string;
  client: Client;
  data?: any;
}
