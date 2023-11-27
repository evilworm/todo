import * as Sentry from '@sentry/node';

export type DescriptionBuilder = (args: any[], context?: any) => any;

export interface SentryTransactionSpanOptions {
  description?: string | DescriptionBuilder;
  data?: string | DescriptionBuilder;
}

export function SentryTransactionSpan<T>(
  options: SentryTransactionSpanOptions,
) {
  return (
    target: Record<string, any>,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) => {
    return {
      ...descriptor,
      async value(...args: any[]): Promise<any> {
        if (
          !Sentry ||
          !Sentry.getCurrentHub() ||
          !Sentry.getCurrentHub().getClient()
        ) {
          return descriptor.value.apply(this, args);
        }

        const description =
          options?.description instanceof Function
            ? options.description(args, this)
            : options?.description;

        const data =
          options?.data instanceof Function
            ? options.data(args, this)
            : options?.data;

        const opts = {
          op: 'client',
          name: descriptor.value.name,
          description,
          data,
        };

        let transaction: Sentry.Transaction;
        if (this.transaction !== undefined) {
          transaction = this.transaction.startChild(opts);
        } else {
          transaction = Sentry.startTransaction(opts);
        }

        let result: T;
        try {
          this.transaction = transaction;
          result = await descriptor.value.apply(this, args);
        } finally {
          transaction.finish();
        }

        return result;
      },
    };
  };
}
