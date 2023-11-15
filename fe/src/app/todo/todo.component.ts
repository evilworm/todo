import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, concatMap } from 'rxjs';
import { ConnService } from '../conn/conn.service';
import { CreateTodoResponse } from '../home/home.interface';
import { Todo } from './todo.interface';

@Component({
  selector: 'app-todo',
  templateUrl: './todo.component.html',
  styleUrls: ['./todo.component.scss'],
})
export class TodoComponent implements OnInit, OnDestroy {
  protected todo: Todo | null = null;
  error = '';
  code = 0;
  loading = false;
  todoId = '';
  filterComplete = false;
  connState: Subscription = new Subscription();

  constructor(
    private readonly conn: ConnService,
    private readonly router: Router
  ) {
    const url = this.router.routerState.snapshot.url?.slice(1) ?? '';
    const ids = url.split('/');
    this.todoId = ids.at(0) ?? '';
  }

  getTodo(id: string) {
    return this.conn.sendMessageWithResponsePromise<Todo>('getTodo', {
      uuid: id,
    });
  }

  async createTodo() {
    const { id } =
      await this.conn.sendMessageWithResponsePromise<CreateTodoResponse>(
        'createTodo'
      );
    this.loadTodo(id);
  }

  async ngOnInit() {
    this.connState = this.conn.connectionState$
      .pipe(
        concatMap(async (state) => {
          if (state) {
            await this.loadTodo();
          }
        })
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.connState?.unsubscribe();
  }

  async loadTodo(id = '') {
    this.error = '';
    this.loading = true;
    this.todoId ??= id;

    try {
      const todo = await this.getTodo(this.todoId);
      this.todo = todo;
    } catch (e: any) {
      this.error = e?.message || 'Unknown error';
      this.code = e?.code || 0;
    } finally {
      this.loading = false;
    }
  }

  async addItem() {
    if (!this.todo) {
      return;
    }

    const afterId = this.todo.items?.[this.todo.items.length - 1]?.id ?? null;
    const id = await this.conn.saveItem({
      uuid: this.todoId,
      index: this.todo.items.length - 1,
      item: { afterId },
    });
    this.todo.items.push({
      id,
      name: '',
      cost: undefined,
      done: false,
    });
    this.todo.items = Object.assign([], this.todo.items);
  }
}
