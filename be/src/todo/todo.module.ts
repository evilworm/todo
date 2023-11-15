import { Module } from '@nestjs/common';
import { ConnModule } from '../conn/conn.module';
import { TodoService } from './todo.service';

@Module({
  imports: [ConnModule],
  providers: [TodoService],
  exports: [TodoService],
})
export class TodoModule {}
