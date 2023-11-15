import { Test, TestingModule } from '@nestjs/testing';
import { ConnGateway } from './conn.gateway';

describe('ConnGateway', () => {
  let gateway: ConnGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConnGateway],
    }).compile();

    gateway = module.get<ConnGateway>(ConnGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
