// src/queues/noopQueue.ts

/** Minimal stub to satisfy the same interface as BullMQ’s Queue */
export class NoopQueue {
  readonly name = "noop";

  /** Called as `emailQueue.add(jobName, data, opts)` */
  async add(_jobName: string, _data: any, _opts?: any): Promise<void> {
    // no-op
  }

  /** Called as `emailQueue.on('error', handler)` */
  on(_event: string, _handler: (...args: any[]) => void): this {
    return this;
  }
}
