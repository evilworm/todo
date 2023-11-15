import { Pipe, PipeTransform } from '@angular/core';
import { TodoItem } from '../todo/todo.interface';

@Pipe({
  name: 'filterComplete',
})
export class FilterCompletePipe implements PipeTransform {
  transform(items: TodoItem[], filterComplete: boolean): any[] {
    if (!items) {
      return items;
    }

    return items.filter((item) => (!filterComplete ? true : !item.done));
  }
}
