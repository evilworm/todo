export interface TodoItem {
  id?: number;
  name?: string;
  cost?: string | undefined;
  done?: boolean;
  parentId?: number | null;
  afterId?: number | null | undefined;
  items?: TodoItem[];
  index?: number;
}

export interface Todo {
  uuid: string;
  items: TodoItem[];
}
