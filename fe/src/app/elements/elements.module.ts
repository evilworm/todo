import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConnModule } from '../conn/conn.module';
import { ClickStopPropagation } from '../directives/click-stop-propagation.directive';
import { MatSharedModule } from '../mat-shared/mat-shared.module';
import { FilterCompletePipe } from '../pipes/filter-complete.pipe';
import { ConnectionComponent } from './connection/connection.component';
import { ListComponent } from './list/list.component';

@NgModule({
  declarations: [
    ConnectionComponent,
    ListComponent,
    ClickStopPropagation,
    FilterCompletePipe,
  ],
  imports: [
    CommonModule,
    ConnModule,
    MatSharedModule,
    FormsModule,
    DragDropModule,
  ],
  exports: [ConnectionComponent, ListComponent],
})
export class ElementsModule {}
