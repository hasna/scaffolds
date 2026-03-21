/**
 * Workers module exports
 */

export { BaseWorker } from "./base-worker.js";
export { FileWorker } from "./file-worker.js";
export type { FileTask } from "./file-worker.js";
export { SearchWorker } from "./search-worker.js";
export type { SearchTask } from "./search-worker.js";
export { TransformWorker } from "./transform-worker.js";
export type { TransformTask } from "./transform-worker.js";

import type { WorkerTask } from "../types.js";
import type { AgentResult } from "../../core/types.js";
import { FileWorker, FileTask } from "./file-worker.js";
import { SearchWorker, SearchTask } from "./search-worker.js";
import { TransformWorker, TransformTask } from "./transform-worker.js";

/**
 * Worker pool for managing concurrent worker execution
 */
export class WorkerPool {
  private maxConcurrent: number;
  private running: number = 0;
  private queue: Array<() => Promise<void>> = [];

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Submit a task to the pool
   */
  async submit(task: WorkerTask): Promise<AgentResult> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        this.running++;
        try {
          let result: AgentResult;

          switch (task.type) {
            case "file":
              result = await FileWorker.run(task as FileTask);
              break;
            case "search":
              result = await SearchWorker.run(task as SearchTask);
              break;
            case "transform":
              result = await TransformWorker.run(task as TransformTask);
              break;
            default:
              throw new Error(`Unknown task type: ${task.type}`);
          }

          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processQueue();
        }
      };

      if (this.running < this.maxConcurrent) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  /**
   * Submit multiple tasks
   */
  async submitAll(tasks: WorkerTask[]): Promise<AgentResult[]> {
    return Promise.all(tasks.map((task) => this.submit(task)));
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.running < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) next();
    }
  }

  /**
   * Get pool status
   */
  getStatus(): { running: number; queued: number; maxConcurrent: number } {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent,
    };
  }
}
