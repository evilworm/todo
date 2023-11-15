import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { FormsModule } from '@angular/forms';
import { ElementsModule } from './elements/elements.module';
import { HomeComponent } from './home/home.component';
import { MatSharedModule } from './mat-shared/mat-shared.module';
import { TodoComponent } from './todo/todo.component';

@NgModule({
  declarations: [AppComponent, HomeComponent, TodoComponent],
  imports: [
    BrowserModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    MatSharedModule,
    ElementsModule,
    FormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
