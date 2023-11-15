import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ConnService } from '../conn/conn.service';
import { CreateTodoResponse } from './home.interface';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent {
  constructor(
    private readonly conn: ConnService,
    private readonly router: Router
  ) {}

  async createTodo() {
    const { id } =
      await this.conn.sendMessageWithResponsePromise<CreateTodoResponse>(
        'createTodo'
      );
    this.router.navigate([id]);
  }
}
