import { ErrorWithCode } from '../error';

export interface Message {
  id: string;
  type: string;
  data: any;
}

export interface ErrorMessage {
  id: string;
  type: 'error';
  error: ErrorWithCode;
}

export interface SaveItemResponse {
  id: number;
}

export interface DeleteItemResponse {
  id: number;
}
