/**
 * Runs async jobs one at a time, in the order they were handed in. For start/stop pairs that
 * must not overlap: a stop still finishing must not undo a start that came after it.
 * A job that fails rejects only its own promise; the next one still runs.
 */
export function createSerial() {
  let last: Promise<unknown> = Promise.resolve();
  return function serial<T>(job: () => Promise<T>): Promise<T> {
    const run = last.then(job, job);
    last = run.catch(() => {});
    return run;
  };
}
