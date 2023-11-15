import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConnModule } from './conn/conn.module';
import { DB_HOST, DB_NAME, DB_PASS, DB_PORT, DB_USER } from './constants';
import { TodoModule } from './todo/todo.module';

@Module({
  imports: [
    TodoModule,
    ConnModule,
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        type: 'mysql',
        host: config.get(DB_HOST, 'localhost'),
        port: +config.get(DB_PORT, 3306),
        username: config.get(DB_USER, 'default'),
        password: config.get(DB_PASS, 'default'),
        database: config.get(DB_NAME, 'default'),
        entities: [__dirname + '/**/*.entity.{ts,js}'],
        migrations: [__dirname + '/migrations/**/*.{ts,js}'],
        migrationsTableName: 'migrations',
        autoLoadEntities: false,
        // logging: ['error', 'warn'],
        logging: true,
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
