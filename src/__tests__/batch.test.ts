import { initialize } from "../client";
import { Field, OpenSearchIndex } from "../decorator";
import { Model } from "../model";
import { BatchProcessor } from "../batch";
import "jest";

jest.mock("../client", () => ({
  initialize: jest.fn(),
  opensearchClient: {
    search: jest.fn().mockResolvedValue({
      body: {
        hits: {
          total: { value: 1, relation: "eq" },
          hits: [
            {
              _index: "test_index",
              _id: "1",
              _score: 1.0,
              _source: {
                name: "John Doe",
                age: 30,
              },
            },
          ],
        },
      },
    }),
    bulk: jest.fn().mockImplementation(({ body }) => {
      const items: Array<{
        index?: {
          _index: any;
          _id: any;
          _version: number;
          result: string;
          status: number;
          error?: { type: string; reason: string };
        };
        delete?: {
          _index: any;
          _id: any;
          _version: number;
          result: string;
          status: number;
          error?: { type: string; reason: string };
        };
      }> = [];

      for (let i = 0; i < body.length; i++) {
        const operation = Object.keys(body[i])[0] as "index" | "delete";
        const operationBody = body[i][operation];

        if (operation === "index") {
          const doc = body[i + 1];
          items.push({
            index: {
              _index: operationBody._index,
              _id: operationBody._id || `test_id_${items.length + 1}`,
              _version: 1,
              result: "created",
              status: 200,
              error: doc.invalidField
                ? { type: "validation_error", reason: "Invalid field" }
                : undefined,
            },
          });
          i++; // Skip the document body
        } else if (operation === "delete") {
          items.push({
            delete: {
              _index: operationBody._index,
              _id: operationBody._id || `test_id_${items.length + 1}`,
              _version: 1,
              result: "deleted",
              status: 200,
              error: undefined,
            },
          });
        }
      }

      const hasErrors = items.some((item) => {
        const operation = Object.keys(item)[0] as "index" | "delete";
        return item[operation]?.error !== undefined;
      });

      return Promise.resolve({
        body: {
          took: 30,
          errors: hasErrors,
          items,
        },
      });
    }),
    indices: {
      create: jest.fn().mockResolvedValue({
        body: { acknowledged: true },
      }),
      delete: jest.fn().mockResolvedValue({
        body: { acknowledged: true },
      }),
      exists: jest.fn().mockResolvedValue({
        body: true,
      }),
      get: jest.fn().mockResolvedValue({
        body: {
          test_index: {
            mappings: {
              properties: {},
            },
          },
        },
      }),
      putMapping: jest.fn().mockResolvedValue({
        body: { acknowledged: true },
      }),
    },
  },
}));

describe("BatchProcessor", () => {
  @OpenSearchIndex({ name: "test_batch" })
  class TestModel extends Model {
    @Field({ type: "keyword" })
    name: string;

    @Field({ type: "integer" })
    age: number;

    @Field({ type: "text" })
    description: string;
  }

  let batchProcessor: BatchProcessor;

  beforeAll(async () => {
    await initialize({
      node: "http://localhost:9200",
      ssl: {
        rejectUnauthorized: false,
      },
    });
  });

  beforeEach(() => {
    batchProcessor = BatchProcessor.getInstance();
    batchProcessor.clear();
  });

  afterEach(() => {
    batchProcessor.clear();
  });

  afterAll(() => {
    batchProcessor.destroy();
  });

  it("should be a singleton", () => {
    const instance1 = BatchProcessor.getInstance();
    const instance2 = BatchProcessor.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("should process bulk index operations", async () => {
    const docs = [
      {
        name: "John Doe",
        age: 25,
        description: "Software Developer",
      },
      {
        name: "Jane Smith",
        age: 30,
        description: "Data Scientist",
      },
    ];

    const response = await batchProcessor.bulkIndex(TestModel, docs, {
      refresh: true,
    });

    expect(response.errors).toBe(false);
    expect(response.items).toHaveLength(2);
    expect(response.items[0].index?.result).toBe("created");
    expect(response.items[1].index?.result).toBe("created");
  });

  it("should process bulk delete operations", async () => {
    // First, index some documents
    const docs = [
      {
        name: "John Doe",
        age: 25,
        description: "Software Developer",
      },
      {
        name: "Jane Smith",
        age: 30,
        description: "Data Scientist",
      },
    ];

    const indexResponse = await batchProcessor.bulkIndex(TestModel, docs, {
      refresh: true,
    });

    expect(indexResponse.errors).toBe(false);
    const ids = indexResponse.items.map((item) => item.index!._id);

    const deleteResponse = await batchProcessor.bulkDelete(TestModel, ids, {
      refresh: true,
    });

    expect(deleteResponse.errors).toBe(false);
    expect(deleteResponse.items).toHaveLength(2);
    expect(deleteResponse.items[0].delete?.result).toBe("deleted");
    expect(deleteResponse.items[1].delete?.result).toBe("deleted");
  });

  it("should respect batch size", async () => {
    batchProcessor.setBatchSize(2);

    const docs = [
      {
        name: "John Doe",
        age: 25,
        description: "Software Developer",
      },
      {
        name: "Jane Smith",
        age: 30,
        description: "Data Scientist",
      },
      {
        name: "Bob Johnson",
        age: 35,
        description: "DevOps Engineer",
      },
    ];

    const response = await batchProcessor.bulkIndex(TestModel, docs);
    expect(response.items).toHaveLength(0); // No immediate response as not all operations are flushed

    const flushResponse = await batchProcessor.flush();
    expect(flushResponse.items).toHaveLength(3);
    expect(flushResponse.errors).toBe(false);
  });

  it("should auto flush after interval", async () => {
    batchProcessor.setAutoFlushInterval(100); // 100ms

    const docs = [
      {
        name: "John Doe",
        age: 25,
        description: "Software Developer",
      },
    ];

    await batchProcessor.bulkIndex(TestModel, docs);
    await new Promise((resolve) => setTimeout(resolve, 150));

    const searchResponse = await TestModel.query<TestModel>()
      .match("name", "John Doe")
      .execute();

    expect(searchResponse.hits.total.value).toBe(1);
    expect(searchResponse.hits.hits[0]._source.name).toBe("John Doe");
  });

  it("should handle errors in bulk operations", async () => {
    const docs = [
      {
        name: "John Doe",
        age: 25,
        description: "Software Developer",
        invalidField: "test", // This should cause an error as it's not in the schema
      } as any,
    ];

    const response = await batchProcessor.bulkIndex(TestModel, docs, {
      refresh: true,
    });

    expect(response.errors).toBe(true);
    expect(response.items[0].index?.error).toBeDefined();
  });

  it("should clear batch operations", async () => {
    const docs = [
      {
        name: "John Doe",
        age: 25,
        description: "Software Developer",
      },
    ];

    await batchProcessor.bulkIndex(TestModel, docs);
    batchProcessor.clear();

    const response = await batchProcessor.flush();
    expect(response.items).toHaveLength(0);
    expect(response.errors).toBe(false);
  });

  it("should throw error when setting invalid batch size", () => {
    expect(() => batchProcessor.setBatchSize(0)).toThrow(
      "[typensearch] Batch size must be greater than 0"
    );
    expect(() => batchProcessor.setBatchSize(-1)).toThrow(
      "[typensearch] Batch size must be greater than 0"
    );
  });

  it("should throw error when setting invalid auto flush interval", () => {
    expect(() => batchProcessor.setAutoFlushInterval(-1)).toThrow(
      "[typensearch] Auto flush interval must be non-negative"
    );
  });

  it("should handle destroyed instance correctly", async () => {
    batchProcessor.destroy();

    await expect(async () => {
      await batchProcessor.bulkIndex(TestModel, [
        {
          name: "Test",
          age: 25,
          description: "Test",
        },
      ]);
    }).rejects.toThrow("[typensearch] BatchProcessor has been destroyed");

    await expect(async () => {
      await batchProcessor.flush();
    }).rejects.toThrow("[typensearch] BatchProcessor has been destroyed");
  });
});
