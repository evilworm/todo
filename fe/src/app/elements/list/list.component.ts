import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { MatSelectionListChange } from '@angular/material/list';
import Decimal from 'decimal.js';
import { BehaviorSubject, Subscription, filter } from 'rxjs';
import { ConnService } from '../../conn/conn.service';
import { TodoItem } from '../../todo/todo.interface';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
})
export class ListComponent implements AfterViewInit, OnInit, OnDestroy {
  editIndices = new Set<number>(); // Keeps track of all items being edited
  hoveredIndex: number | null = null;
  _totalCost = new BehaviorSubject<Decimal>(new Decimal(0));
  _childrenCost = new Map<Number, Decimal>();
  isDragging = false;
  private _subscriptions: Subscription[] = [];
  items: TodoItem[] = [];

  constructor(
    private readonly conn: ConnService,
    private cdRef: ChangeDetectorRef
  ) {}

  @Input() todoItems: TodoItem[] = [];

  @Input() uuid: string = '';

  @Input() parentId: number | null = null;

  @Input() filterComplete = false;

  @Output()
  totalCost = this._totalCost.asObservable();

  @Output()
  itemsUpdate = new EventEmitter<TodoItem[]>();

  ngAfterViewInit(): void {
    this.calculateTotalCost();
    this.cdRef.detectChanges();
  }

  private triggerUpdate() {
    this.items = Object.assign([], this.items);
    this.itemsUpdate.emit(this.items);
  }

  ngOnInit(): void {
    this.items = [...this.todoItems];

    // handle changes from server side
    this._subscriptions.push(
      this.conn
        .messagesByType<TodoItem>('saveItem')
        .pipe(filter((item) => item.parentId === this.parentId))
        .subscribe((item) => {
          const index = this.items.findIndex((i) => i.id === item.id);

          if (index < 0) {
            this.items.push(item);
          } else {
            this.items[index].cost = item.cost;
            this.items[index].name = item.name;
            this.items[index].done = item.done;
            this.items[index].afterId = item.afterId;

            this.calculateTotalCost();

            // check if item has been moved
            if (
              item.index !== undefined &&
              item.index > -1 &&
              index !== item.index
            ) {
              moveItemInArray(this.items, index, item.index);
            }
          }
          this.triggerUpdate();
        })
    );

    this._subscriptions.push(
      this.conn
        .messagesByType<TodoItem>('deleteItem')
        .pipe(
          filter((item) => {
            return item.parentId === this.parentId;
          })
        )
        .subscribe((item) => {
          const index = this.items.findIndex((i) => i.id === item.id);
          this.items.splice(index, 1);
          this.triggerUpdate();
        })
    );
  }

  ngOnDestroy(): void {
    this._totalCost.complete();
    this._childrenCost.clear();
    this._subscriptions.forEach((s) => s.unsubscribe());
  }

  toDecimal(value: any) {
    try {
      return new Decimal(value);
    } catch (e) {
      return new Decimal(0);
    }
  }

  itemCost(index: number) {
    if (!this.items[index]) {
      return;
    }

    const itemCost = this.items[index].cost;
    const childrenCost = this._childrenCost.get(index);

    if (
      (itemCost === undefined || itemCost === null) &&
      childrenCost === undefined
    ) {
      return '';
    }

    return this.toDecimal(itemCost)
      .plus(childrenCost ?? 0)
      .toFixed(2);
  }

  addToTotalCost(index: number, cost: Decimal) {
    this._childrenCost.set(index, cost);
  }

  calculateTotalCost() {
    let total = new Decimal(0);
    let haveCost = false;
    this.items.forEach((item) => {
      if (item.cost) {
        let cost = new Decimal(0);
        try {
          cost = new Decimal(item.cost);
        } catch (e) {}
        total = total.plus(cost);
        haveCost = true;
      }
    });

    if (haveCost) {
      this._totalCost.next(total);
    }
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.items, event.previousIndex, event.currentIndex);
    this.items = Object.assign([], this.items);
    const update = [
      ...new Set([
        event.currentIndex,
        event.previousIndex,
        event.currentIndex + 1,
        event.previousIndex + 1,
      ]),
    ];
    update.forEach(this.saveItem.bind(this));
    this.triggerUpdate();
  }

  onDragStart(event: MouseEvent) {
    // Prevent the click event from propagating to the checkbox
    event.stopPropagation();
  }

  onChange(event: MatSelectionListChange) {
    const changedOptions = event.options;
    changedOptions.forEach((option) => {
      const value = option.value as TodoItem;
      const selected = option.selected;

      const index = this.items.findIndex((i) => i.id == value.id);
      this.items[index].done = selected;
      this.saveItem(index);
    });
    this.calculateTotalCost();
    this.triggerUpdate();
  }

  enableEdit(i: number) {
    this.editIndices.add(i);
  }

  async cancel(index: number) {
    this.editIndices.delete(index);
  }

  async saveItem(index: number) {
    if (index > this.items.length - 1 || index < 0) {
      return;
    }
    this.editIndices.delete(index);
    let afterId = null;
    if (index > 0) {
      afterId = this.items[index - 1].id;
    }
    if (this.items[index].cost === '' || this.items[index].cost === null) {
      this.items[index].cost = undefined;
    }
    await this.conn.saveItem({
      uuid: this.uuid,
      index,
      item: {
        ...this.items[index],
        afterId,
      },
    });
    this.calculateTotalCost();
  }

  async deleteItem(index: number) {
    await this.conn.deleteItem({
      uuid: this.uuid,
      item: this.items[index],
    });
  }

  async addChild(index: number) {
    const item = this.items[index];
    item.items ??= [];

    let afterId = undefined;
    if (item.items.length > 0) {
      afterId = item.items[item.items.length - 1].id;
    }

    const parentId = this.items[index]?.id ?? null;

    const id = await this.conn.saveItem({
      uuid: this.uuid,
      index: item.items.length,
      item: {
        parentId,
        afterId,
      },
    });
  }
}
