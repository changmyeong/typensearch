import { BulkOptions, BulkResponse } from "./types";
import { opensearchClient } from "./client";
import { indexMetadataMap } from "./decorator";

interface BatchOperation {
  index?: {
    _index: string;
    _id?: string;
  };
  delete?: {
    _index: string;
    _id: string;
  };
}

export class BatchProcessor {
  private static instance: BatchProcessor;
  private operations: any[] = [];
  private batchSize: number = 1000;
  private autoFlushInterval: number = 5000; // 5 seconds
  private autoFlushTimer: NodeJS.Timeout | null = null;
  private isDestroyed: boolean = false;
  private static beforeExitHandler: () => void;

  private constructor() {
    this.startAutoFlush();

    // beforeExit 핸들러가 아직 등록되지 않은 경우에만 등록
    if (!BatchProcessor.beforeExitHandler) {
      BatchProcessor.beforeExitHandler = () => {
        if (BatchProcessor.instance) {
          BatchProcessor.instance.destroy();
        }
      };
      process.on("beforeExit", BatchProcessor.beforeExitHandler);
    }
  }

  static getInstance(): BatchProcessor {
    if (!BatchProcessor.instance) {
      BatchProcessor.instance = new BatchProcessor();
    }
    return BatchProcessor.instance;
  }

  private startAutoFlush(): void {
    if (this.autoFlushTimer) {
      clearInterval(this.autoFlushTimer);
    }
    this.autoFlushTimer = setInterval(() => {
      if (this.operations.length > 0) {
        this.flush();
      }
    }, this.autoFlushInterval);
  }

  setBatchSize(size: number): void {
    if (size < 1) {
      throw new Error("[typensearch] Batch size must be greater than 0");
    }
    this.batchSize = size;
  }

  setAutoFlushInterval(interval: number): void {
    if (interval < 0) {
      throw new Error("[typensearch] Auto flush interval must be non-negative");
    }
    this.autoFlushInterval = interval;
    this.startAutoFlush();
  }

  addOperation(operation: BatchOperation, doc?: any): void {
    if (this.isDestroyed) {
      throw new Error("[typensearch] BatchProcessor has been destroyed");
    }

    this.operations.push(operation);
    if (doc) {
      this.operations.push(doc);
    }

    // 배치 크기 계산 시 index 작업은 2개의 항목을 사용하고, delete 작업은 1개의 항목을 사용함
    const effectiveSize = this.operations.reduce((size, op) => {
      if (op.index) {
        return size + 0.5; // index 작업은 2개의 항목을 사용하므로 0.5씩 증가
      } else if (op.delete) {
        return size + 1; // delete 작업은 1개의 항목을 사용
      }
      return size;
    }, 0);

    if (effectiveSize >= this.batchSize) {
      this.flush();
    }
  }

  async flush(options?: BulkOptions): Promise<BulkResponse> {
    if (this.isDestroyed) {
      throw new Error("[typensearch] BatchProcessor has been destroyed");
    }

    if (this.operations.length === 0) {
      return {
        took: 0,
        errors: false,
        items: [],
      };
    }

    const operationsToFlush = [...this.operations];
    this.operations = [];

    try {
      const response = await opensearchClient.bulk({
        body: operationsToFlush,
        ...options,
      });
      return response.body as BulkResponse;
    } catch (error) {
      // 실패 시 작업을 다시 큐에 추가
      this.operations = [...operationsToFlush, ...this.operations];
      throw error;
    }
  }

  async bulkIndex<T>(
    modelClass: new () => T,
    docs: Partial<T>[],
    options: BulkOptions = {}
  ): Promise<BulkResponse> {
    if (this.isDestroyed) {
      throw new Error("[typensearch] BatchProcessor has been destroyed");
    }

    const metadata = indexMetadataMap.get(modelClass.prototype.constructor);
    if (!metadata) {
      throw new Error("[typensearch] No metadata found for model");
    }

    const indexName = metadata.name!;
    docs.forEach((doc) => {
      const _id = (doc as any)._id;
      const op: any = { index: { _index: indexName } };
      if (typeof _id !== "undefined") op.index._id = _id;
      const docBody = { ...(doc as any) };
      if (typeof _id !== "undefined") delete docBody._id;
      this.addOperation(op, docBody);
    });

    if (options.refresh) {
      return this.flush(options);
    }

    return {
      took: 0,
      errors: false,
      items: [],
    };
  }

  async bulkDelete<T>(
    modelClass: new () => T,
    ids: string[],
    options: BulkOptions = {}
  ): Promise<BulkResponse> {
    if (this.isDestroyed) {
      throw new Error("[typensearch] BatchProcessor has been destroyed");
    }

    const metadata = indexMetadataMap.get(modelClass.prototype.constructor);
    if (!metadata) {
      throw new Error("[typensearch] No metadata found for model");
    }

    const indexName = metadata.name!;
    ids.forEach((id) => {
      this.addOperation({
        delete: {
          _index: indexName,
          _id: id,
        },
      });
    });

    if (options.refresh) {
      return this.flush(options);
    }

    return {
      took: 0,
      errors: false,
      items: [],
    };
  }

  clear(): void {
    this.operations = [];
  }

  destroy(): void {
    if (this.autoFlushTimer) {
      clearInterval(this.autoFlushTimer);
      this.autoFlushTimer = null;
    }
    this.isDestroyed = true;
    this.clear();

    // beforeExit 핸들러 제거
    if (BatchProcessor.beforeExitHandler) {
      process.removeListener("beforeExit", BatchProcessor.beforeExitHandler);
      BatchProcessor.beforeExitHandler = undefined;
    }

    BatchProcessor.instance = null as any;
  }
}
