import { ConsoleLogger, Injectable } from '@nestjs/common';
import { Socket } from 'socket.io-client';
import { EntityManager } from 'typeorm';
import { ConnGateway } from '../conn/conn.gateway';
import { MessageWithType } from '../conn/conn.interface';
import { ENOTFOUND } from '../constants';
import { Item } from '../entities/item.entity';
import { Todo } from '../entities/todo.entity';
import { ErrorWithCode } from '../error';
import { NestedItem, NestedTodo } from './todo.interface';

@Injectable()
export class TodoService {
  private logger = new ConsoleLogger(TodoService.name);
  private clientTodoTracker: Map<string, Socket[]> = new Map();

  private TYPE_RESPONSE = 'response';
  private TYPE_SAVE = 'saveItem';
  private TYPE_DELETE = 'deleteItem';
  private TYPE_CREATE = 'createTodo';
  private TYPE_GET = 'getTodo';

  constructor(
    private readonly conn: ConnGateway,
    private manager: EntityManager,
  ) {
    this.conn.onMessage(this.TYPE_GET, this.getTodo.bind(this));
    this.conn.onMessage(this.TYPE_CREATE, this.createTodo.bind(this));
    this.conn.onMessage(this.TYPE_SAVE, this.saveItem.bind(this));
    this.conn.onMessage(this.TYPE_DELETE, this.deleteItem.bind(this));
    this.conn.onClientDisconnect(this.handleDisconnect.bind(this));
  }

  private addClient(uuid: string, client: Socket): void {
    const values = this.clientTodoTracker.get(uuid) || [];
    values.push(client);
    this.clientTodoTracker.set(uuid, values);
  }

  private deleteClient(client: Socket): void {
    this.clientTodoTracker.forEach((values, key) => {
      const index = values.findIndex((i) => i.id == client.id);
      if (index !== -1) {
        values.splice(index, 1);
        // If the array is empty after deletion, remove the key from the map
        if (values.length === 0) {
          this.clientTodoTracker.delete(key);
        } else {
          this.clientTodoTracker.set(key, values);
        }
      }
    });
  }

  broadcast /*ToOthers*/(
    /*mySocket: Socket,*/
    uuid: string,
    type: string,
    item: Partial<NestedItem>,
  ) {
    const values = this.clientTodoTracker.get(uuid);
    if (!values) return;
    values
      /*.filter((cl) => cl.id !== mySocket.id)*/
      .forEach((client) => {
        this.conn.sendMessage(client, type, item);
      });
  }

  handleDisconnect(client: Socket) {
    this.deleteClient(client);
  }

  async createTodo(message: MessageWithType) {
    const todo = await this.manager.save(Todo, {} as Todo);
    this.conn.sendMessage(
      message.socket,
      this.TYPE_RESPONSE,
      { id: todo.uuid },
      message.id,
    );
    this.deleteClient(message.socket); // TODO: allow multiple todos?
    this.addClient(todo.uuid, message.socket);
  }

  async deleteItem(message: MessageWithType) {
    if (!message.data?.uuid) return;

    const todo = await this.findTodo(message.data?.uuid, true);
    if (!todo) return;

    const itemId = message.data?.item?.id;
    const currentItem = todo.items.find((i) => i.id == itemId);
    if (!currentItem) {
      return this.conn.sendErrorMessage(
        message.socket,
        new ErrorWithCode(
          'Item you are trying to remove was not found',
          ENOTFOUND,
        ),
        message.id,
      );
    }

    const map = new Map<number, NestedItem>();
    todo.items.forEach((item) => {
      map.set(item.id, item);
    });

    const removedIds = this.findItemsToDelete(todo.items, itemId);

    // delete items
    await this.manager.delete(Item, removedIds);

    // remap afterId for next element in list
    const nextElement = todo.items.find((i) => i.afterId == itemId);
    if (nextElement) {
      nextElement.afterId = currentItem?.afterId ?? null;
      this.manager.save(nextElement);
      this.broadcast(todo.uuid, this.TYPE_SAVE, nextElement);
    }

    this.conn.sendMessage(
      message.socket,
      this.TYPE_RESPONSE,
      { status: 'ok' },
      message.id,
    );

    this.broadcast(todo.uuid, this.TYPE_DELETE, currentItem);
  }

  private findItemsToDelete(items: Item[], idToDelete: number): number[] {
    const deletedIds: number[] = [];

    function recursiveFindToDelete(id: number) {
      const childrenToDelete = items
        .filter((item) => item.parentId === id)
        .map((child) => child.id);

      for (const childId of childrenToDelete) {
        recursiveFindToDelete(childId);
      }

      deletedIds.push(id);
    }

    recursiveFindToDelete(idToDelete);

    return deletedIds;
  }

  async saveItem(message: MessageWithType) {
    if (!message.data?.uuid) return;

    const todo = await this.findTodo(message.data?.uuid);
    if (!todo) return;

    const todoItem = message.data.item;

    let cost = null;
    if (todoItem.cost !== '') {
      cost = Number(todoItem.cost);
      if (isNaN(cost)) {
        cost = null;
      }
    }

    let item = this.manager.create(Item, {
      id: todoItem.id,
      name: todoItem.name,
      parentId: todoItem.parentId,
      afterId: todoItem.afterId,
      done: todoItem.done,
      cost: cost === null ? null : cost.toFixed(2),
      todo: todo,
    });

    let savedItem = await this.manager.save(Item, item);
    this.conn.sendMessage(
      message.socket,
      this.TYPE_RESPONSE,
      { status: 'ok' },
      message.id,
    );
    this.broadcast(/*ToOthers*/ /*message.socket, */ todo.uuid, message.type, {
      ...savedItem,
      index: message.data.index ?? -1,
    });
  }

  async getTodo(message: MessageWithType) {
    const todo = await this.findTodo(message.data?.uuid, true);

    if (!todo) {
      return this.conn.sendErrorMessage(
        message.socket,
        new ErrorWithCode('No such todo list', ENOTFOUND),
        message.id,
      );
    }

    this.deleteClient(message.socket); // TODO: allow multiple todos?
    this.addClient(todo.uuid, message.socket);

    const nestedTodo = {
      uuid: todo.uuid,
      name: todo.name,
      items: this.sortItems(this.convertToTree(todo.items)),
    } as NestedTodo;

    this.conn.sendMessage(
      message.socket,
      this.TYPE_RESPONSE,
      nestedTodo,
      message.id,
    );
  }

  private removeItemAndReturn<T>(
    itemMap: Map<number | null, T>,
    afterId: number | null,
  ): T | null {
    const item = itemMap.get(afterId);
    if (item) {
      itemMap.delete(afterId);
    }
    return item ?? null;
  }

  private sortItems(items: NestedItem[]): NestedItem[] {
    const itemMap = new Map<number | null, NestedItem>();
    items.forEach((item) => itemMap.set(item.afterId, item));

    const sortedItems: NestedItem[] = [];

    // Start with the first item (with afterId = null)
    let currentAfterId: number | null = null;
    let currentItem = this.removeItemAndReturn(itemMap, currentAfterId);

    while (currentItem) {
      if (currentItem.items?.length) {
        currentItem.items = this.sortItems(currentItem.items);
      }
      sortedItems.push(currentItem);
      currentAfterId = currentItem.id;
      currentItem = this.removeItemAndReturn(itemMap, currentAfterId);
    }

    return sortedItems;
  }

  private convertToTree(data: Item[]): NestedItem[] {
    const map = new Map<number, NestedItem>();
    data.forEach((item) => {
      map.set(item.id, item);
    });

    const tree: NestedItem[] = [];
    data.forEach((item) => {
      const node = map.get(item.id);

      if (!node) {
        return;
      }

      if (item.parentId === null) {
        tree.push(node);
      } else {
        const parent = map.get(item.parentId);
        if (parent) {
          parent.items ??= [];
          parent.items.push(node);
        }
      }
    });

    return tree;
  }

  private findTodo(uuid: string, withRelations = false) {
    try {
      return this.manager.getRepository(Todo).findOne({
        where: { uuid },
        relations: withRelations ? ['items'] : [],
      });
    } catch (e) {
      this.logger.error('DB error: ', e);
    }
  }
}
