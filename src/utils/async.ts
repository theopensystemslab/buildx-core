import { Task, delay, of } from "fp-ts/Task";

interface RetryConfig {
  retryCount: number;
  initialDelayMillis: number;
  backOffFactor: number;
}

const defaultRetryConfig: RetryConfig = {
  retryCount: 5,
  initialDelayMillis: 500,
  backOffFactor: 2,
};

export const withRetry =
  (config: Partial<RetryConfig> = {}) =>
  <A>(task: Task<A>): Task<A> => {
    const { retryCount, initialDelayMillis, backOffFactor } = {
      ...defaultRetryConfig,
      ...config,
    };

    const retry =
      (remainingRetries: number, delayMillis: number): Task<A> =>
      async () => {
        try {
          return await task();
        } catch (error) {
          if (remainingRetries === 0) {
            throw error;
          } else {
            await delay(delayMillis)(of(undefined))();
            return retry(remainingRetries - 1, delayMillis * backOffFactor)();
          }
        }
      };

    return retry(retryCount, initialDelayMillis);
  };

export const retryTask = withRetry();
