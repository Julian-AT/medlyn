/** Bound waiting even when an upstream tool or validator ignores cancellation. */
export async function beforeDeadline<T>(
  run: () => PromiseLike<T>,
  signal: AbortSignal,
): Promise<T> {
  signal.throwIfAborted();
  let abort: () => void = () => undefined;
  const interrupted = new Promise<never>((_, reject) => {
    abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
  });
  try {
    return await Promise.race([run(), interrupted]);
  } finally {
    signal.removeEventListener("abort", abort);
  }
}
