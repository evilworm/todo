import { ConsoleLogger, Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Cacheable } from '../cache/cacheable.decorator';
import { InvalidateCacheable } from '../cache/invalidate-cacheable.decorator';
import { Client } from '../conn/client';
import { SentryTransactionSpan } from '../conn/client-transaction-span.decorator';
import { ConnGateway } from '../conn/conn.gateway';
import { MessageWithType } from '../conn/conn.interface';
import { ENOTFOUND, EUNKNOWN } from '../constants';
import { Item } from '../entities/item.entity';
import { Todo } from '../entities/todo.entity';
import { ErrorWithCode } from '../error';
import { adler32 } from '../utils';
import { NestedItem, NestedTodo } from './todo.interface';

@Injectable()
export class TodoService {
  private logger = new ConsoleLogger(TodoService.name);
  private clientTodoTracker: Map<string, Client[]> = new Map();

  private TYPE_RESPONSE = 'response';
  private TYPE_SAVE = 'saveItem';
  private TYPE_DELETE = 'deleteItem';
  private TYPE_CREATE = 'createTodo';
  private TYPE_GET = 'getTodo';

  private messageMap = [
    {
      type: this.TYPE_CREATE,
      handler: this.wsCreateTodo,
    },
    {
      type: this.TYPE_GET,
      handler: this.wsGetTodo,
    },
    {
      type: this.TYPE_SAVE,
      handler: this.wsSaveItem,
    },
    {
      type: this.TYPE_DELETE,
      handler: this.wsDeleteItem,
    },
  ];

  constructor(
    private readonly conn: ConnGateway,
    private manager: EntityManager,
  ) {
    for (const message of this.messageMap) {
      this.conn.onMessage(message.type, message.handler.bind(this));
    }
    this.conn.onClientDisconnect(this.handleDisconnect.bind(this));
  }

  @SentryTransactionSpan({
    description: 'ws create todo',
  })
  async wsCreateTodo(message: MessageWithType) {
    try {
      const todo = await this.createTodo();
      message.client.sendMessage(
        this.TYPE_RESPONSE,
        { id: todo.uuid },
        message.id,
      );
      this.subscribeToTodo(todo.uuid, message.client);
    } catch (error) {
      if (error?.code) {
        message.client.sendErrorMessage(error, message.id);
      } else {
        message.client.sendErrorMessage(
          new ErrorWithCode('Could not create new TODO', EUNKNOWN),
          message.id,
        );
      }
    }
  }

  @SentryTransactionSpan({
    description: 'ws get todo',
  })
  async wsGetTodo(message: MessageWithType) {
    const uuid = message.data?.uuid;

    try {
      const nestedTodo = await this.getTodo(uuid);
      this.subscribeToTodo(uuid, message.client);

      message.client.sendMessage(this.TYPE_RESPONSE, nestedTodo, message.id);
    } catch (error) {
      if (error?.code) {
        message.client.sendErrorMessage(error, message.id);
      } else {
        message.client.sendErrorMessage(
          new ErrorWithCode('Could not get TODO', EUNKNOWN),
          message.id,
        );
      }
    }
  }

  @SentryTransactionSpan({
    description: 'ws save todo',
  })
  async wsSaveItem(message: MessageWithType) {
    const uuid = message.data.uuid;
    const item = message.data.item;
    try {
      const savedItem = await this.saveItem(uuid, item);
      message.client.sendMessage(
        this.TYPE_RESPONSE,
        { status: 'ok' },
        message.id,
      );
      this.broadcast(uuid, message.type, {
        ...savedItem,
        index: message.data.index ?? -1,
      });
    } catch (error) {
      if (error?.code) {
        message.client.sendErrorMessage(error, message.id);
      } else {
        message.client.sendErrorMessage(
          new ErrorWithCode('Could not save TODO', EUNKNOWN),
          message.id,
        );
      }
    }
  }

  @SentryTransactionSpan({
    description: 'ws delete todo',
  })
  async wsDeleteItem(message: MessageWithType) {
    const uuid = message.data.uuid;
    const item = message.data.item;
    try {
      const itemsAffacted = await this.deleteItem(uuid, item);

      message.client.sendMessage(
        this.TYPE_RESPONSE,
        { status: 'ok' },
        message.id,
      );

      itemsAffacted.forEach((i) => {
        this.broadcast(uuid, i.type, i.item);
      });
    } catch (error) {
      if (error?.code) {
        message.client.sendErrorMessage(error, message.id);
      } else {
        message.client.sendErrorMessage(
          new ErrorWithCode('Could not delete TODO item', EUNKNOWN),
          message.id,
        );
      }
    }
  }

  @SentryTransactionSpan({
    description: 'Subscribe to todo ',
  })
  private subscribeToTodo(uuid: string, client: Client): void {
    this.unsubscribeFromTodos(client); // allow only one active todo per client
    const values = this.clientTodoTracker.get(uuid) || [];
    values.push(client);
    this.clientTodoTracker.set(uuid, values);
  }

  @SentryTransactionSpan({
    description: 'Unsubscribe from todos',
  })
  private unsubscribeFromTodos(client: Client): void {
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

  @SentryTransactionSpan({
    description: 'Broadcast to all clients subscribed to specific todo uuid',
  })
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
        client.sendMessage(type, item);
      });
  }

  @SentryTransactionSpan({
    description: 'Client disconnect unsubscribe from todos',
  })
  handleDisconnect(client: Client) {
    this.unsubscribeFromTodos(client);
  }

  @SentryTransactionSpan({
    description: 'createTodo',
  })
  async createTodo() {
    return this.manager.save(Todo, {} as Todo);
  }

  @SentryTransactionSpan({
    description: 'Delete item from todo',
  })
  @InvalidateCacheable({ key: (args: any[]) => 'todo:' + args[0] })
  async deleteItem(uuid: string, item: Item) {
    const todo = await this.findTodo(uuid, true);
    if (!todo) return;

    const currentItem = todo.items.find((i) => i.id == item.id);
    if (!currentItem) {
      throw new ErrorWithCode(
        'Item you are trying to remove was not found',
        ENOTFOUND,
      );
    }

    const map = new Map<number, NestedItem>();
    todo.items.forEach((item) => {
      map.set(item.id, item);
    });

    const removedIds = this.findItemsToDelete(todo.items, item.id);

    // delete items
    await this.manager.delete(Item, removedIds);

    const itemsAffected = [];
    // remap afterId for next element in list
    const nextElement = todo.items.find((i) => i.afterId == item.id);
    if (nextElement) {
      nextElement.afterId = currentItem?.afterId ?? null;
      this.manager.save(nextElement);
      itemsAffected.push({ type: this.TYPE_SAVE, item: nextElement });
    }
    itemsAffected.push({ type: this.TYPE_DELETE, item: currentItem });
    return itemsAffected;
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

  @SentryTransactionSpan({
    description: 'Save item in todo',
  })
  @InvalidateCacheable({ key: (args: any[]) => 'todo:' + args[0] })
  async saveItem(uuid: string, item: Item) {
    const todo = await this.findTodo(uuid);
    if (!todo) return;

    let cost = null;
    if (item.cost !== '') {
      cost = Number(item.cost);
      if (isNaN(cost)) {
        cost = null;
      }
    }

    let dbItem = this.manager.create(Item, {
      id: item.id,
      name: item.name,
      parentId: item.parentId,
      afterId: item.afterId,
      done: item.done,
      cost: cost === null ? null : cost.toFixed(2),
      todo: todo,
    });

    return this.manager.save(Item, dbItem);
  }

  @SentryTransactionSpan({
    description: 'Get todo from DB',
  })
  @Cacheable({ key: (args: any[]) => 'todo:' + args[0] })
  async getTodo(uuid: string) {
    const todo = await this.findTodo(uuid, true);

    if (!todo) {
      throw new ErrorWithCode('No such todo list', ENOTFOUND);
    }

    const nestedTodo = {
      uuid: todo.uuid,
      name: todo.name,
      items: await this.sortItems(this.convertToTree(todo.items)),
    } as NestedTodo;

    return nestedTodo;
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

  @Cacheable({ key: (args: any[]) => 'items:' + adler32(args[0]) })
  // wrapper for sortItems for cache purposes
  private async sortItems(items: NestedItem[]): Promise<NestedItem[]> {
    return this._sortItems(items);
  }

  private _sortItems(items: NestedItem[]): NestedItem[] {
    const itemMap = new Map<number | null, NestedItem>();
    items.forEach((item) => itemMap.set(item.afterId, item));

    const sortedItems: NestedItem[] = [];

    // Start with the first item (with afterId = null)
    let currentAfterId: number | null = null;
    let currentItem = this.removeItemAndReturn(itemMap, currentAfterId);

    while (currentItem) {
      if (currentItem.items?.length) {
        currentItem.items = this._sortItems(currentItem.items);
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

  @SentryTransactionSpan({
    description: 'Find todo in DB',
  })
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
