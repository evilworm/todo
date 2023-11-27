import * as Sentry from '@sentry/node';
import { Logger, QueryRunner } from 'typeorm';

export class TypeormLogger implements Logger {
  private sentryBreadcrumb(category: string, message: string, data?: any) {
    Sentry.addBreadcrumb({
      category,
      message,
      data,
    });
  }

  logQuery(
    query: string,
    parameters?: any[] | undefined,
    queryRunner?: QueryRunner | undefined,
  ) {
    this.sentryBreadcrumb('query', 'TypeORM Query', { query, parameters });
  }

  logQueryError(
    error: string,
    query: string,
    parameters?: any[] | undefined,
    queryRunner?: QueryRunner | undefined,
  ) {
    this.sentryBreadcrumb('error', 'TypeORM Query Error', {
      error,
      query,
      parameters,
    });
  }

  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[] | undefined,
    queryRunner?: QueryRunner | undefined,
  ) {
    this.sentryBreadcrumb('slow-query', 'TypeORM Slow Query', {
      time,
      query,
      parameters,
    });
  }

  logSchemaBuild(message: string, queryRunner?: QueryRunner | undefined) {
    this.sentryBreadcrumb('schema-build', 'TypeORM Schema Build', { message });
  }

  logMigration(message: string, queryRunner?: QueryRunner | undefined) {
    this.sentryBreadcrumb('migration', 'TypeORM Migration', { message });
  }

  log(
    level: 'log' | 'info' | 'warn',
    message: any,
    queryRunner?: QueryRunner | undefined,
  ) {
    Sentry.captureMessage(message, level as Sentry.SeverityLevel);
  }
}
