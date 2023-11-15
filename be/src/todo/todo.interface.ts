export interface Message {
  type: string;
  data: any;
}

export interface NestedItem {
  id: number;
  name: string;
  cost: string | null;
  done: boolean;
  afterId: number | null;
  index?: number;
  items?: NestedItem[];
}

export interface NestedTodo {
  uuid: string;
  items: NestedItem[];
}

export interface CreateTodoResponse {
  id: string;
}
