import { Module } from '@nestjs/common';
import { ConnGateway } from './conn.gateway';

@Module({
  providers: [ConnGateway],
  exports: [ConnGateway],
})
export class ConnModule {}
