import { validateTransfer } from "./transport";
import { limits, type Frame } from "./policy";
export class RestrictedClient {
  private worker = new Worker(new URL("./runtime.worker.ts", import.meta.url), {
    type: "module",
  });
  private queue: {
    resolve: (frame: Frame) => void;
    reject: (e: Error) => void;
  }[] = [];
  private closed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  constructor() {
    this.worker.onmessage = ({ data }) => {
      const task = this.queue.shift();
      if (!task) return;
      if (data.error) task.reject(Error(data.error));
      else task.resolve(data.frame);
      if (!this.queue.length) clearTimeout(this.timer);
    };
    this.worker.onerror = () => this.close("Worker failed");
    this.worker.onmessageerror = () => this.close("Invalid runtime response");
  }
  request(message: object): Promise<Frame> {
    try {
      validateTransfer(message);
    } catch (e) {
      return Promise.reject(e);
    }
    if (this.closed || this.queue.length >= limits.queue)
      return Promise.reject(Error("Runtime closed or queue budget exceeded"));
    return new Promise((resolve, reject) => {
      if (!this.queue.length)
        this.timer = setTimeout(
          () => this.close("Runtime deadline exceeded"),
          limits.deadlineMs,
        );
      this.queue.push({ resolve, reject });
      this.worker.postMessage(message);
    });
  }
  close(reason = "Session closed") {
    this.closed = true;
    clearTimeout(this.timer);
    this.worker.terminate();
    for (const task of this.queue.splice(0)) task.reject(Error(reason));
  }
}
