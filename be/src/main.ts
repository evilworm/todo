import { ConsoleLogger, INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as Sentry from '@sentry/node';
import { Integrations } from '@sentry/node';
import * as express from 'express';
import { AppModule } from './app.module';
import { NODE_ENV, SENTRY_DSN } from './constants';

const logger = new ConsoleLogger('Bootstrap');

function createSentry(app: ReturnType<typeof express>): typeof Sentry | null {
  if (SENTRY_DSN in process.env && process.env[SENTRY_DSN]) {
    logger.verbose('Initializing Sentry: ' + process.env[SENTRY_DSN]);
    Sentry.init({
      environment: process.env[NODE_ENV],
      dsn: process.env[SENTRY_DSN],
      integrations: [
        new Integrations.Http({ tracing: true }),
        new Integrations.Express({ app }),
        new Integrations.Mysql(),
      ],
      tracesSampleRate: 1.0,
    });

    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());

    return Sentry;
  }
  return null;
}

async function bootstrap() {
  let app: INestApplication<any>;
  let expressApp: ReturnType<typeof express>;
  let sentry: typeof Sentry | null;

  try {
    expressApp = express();
    sentry = createSentry(expressApp);
  } catch (error) {
    console.error(error);
    process.exit(1);
    // wrap in launcher so it restarts on exit
  }

  const transaction =
    sentry &&
    sentry.startTransaction({
      op: 'boot',
      name: 'TODO application bootstrap',
    });

  try {
    app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  } catch (error) {
    sentry &&
      sentry.captureException(error, {
        level: 'fatal',
        fingerprint: [error.message],
        extra: { ...error },
        contexts: {},
      });
    process.exit(1);
    // wrap in launcher so it restarts on exit
  } finally {
    transaction && transaction.finish();
  }

  await app.listen(3000);
}

bootstrap()
  .then(() => {
    console.log('Application bootstrap complete');
  })
  .catch((error: Error) => {
    console.log(`Application bootstrap error: ${error.message}`);

    throw error;
  });
