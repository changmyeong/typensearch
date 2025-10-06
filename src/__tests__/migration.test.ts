import { initialize } from "../client";
import { Field, OpenSearchIndex, indexMetadataMap } from "../decorator";
import { Model } from "../model";
import { opensearchClient } from "../client";
import { MIGRATION_INDEX } from "../migration";
import "jest";

jest.mock("../decorator", () => {
  const originalModule = jest.requireActual("../decorator");
  const metadata = new Map();

  const Field = (options?: any): PropertyDecorator => {
    return function (target: any, propertyKey: string) {
      const constructor = target.constructor;
      const existingMetadata = metadata.get(constructor) || { properties: {} };

      options = options || {
        type: "keyword",
        required: false,
      };

      const { type, required, ...fieldOptions } = options;
      delete fieldOptions.default;

      existingMetadata.properties[propertyKey] = {
        type,
        required,
        default: options.default,
        options: fieldOptions,
      };

      metadata.set(constructor, existingMetadata);
    };
  };

  const OpenSearchIndex = (options?: any): ClassDecorator => {
    return function (constructor: Function) {
      const existingMetadata = metadata.get(constructor) || { properties: {} };
      const indexName = (options?.name || constructor.name).toLowerCase();
      metadata.set(constructor, {
        ...existingMetadata,
        name: indexName,
        numberOfShards: options?.numberOfShards,
        numberOfReplicas: options?.numberOfReplicas,
      });

      metadata.set(constructor.prototype.constructor, {
        ...existingMetadata,
        name: indexName,
        numberOfShards: options?.numberOfShards,
        numberOfReplicas: options?.numberOfReplicas,
      });
    };
  };

  const mockMetadataMap = {
    get: (constructor: any) => {
      if (!constructor) return undefined;
      const meta = metadata.get(constructor);
      if (meta) return meta;

      if (constructor.prototype?.constructor) {
        return metadata.get(constructor.prototype.constructor);
      }
      return undefined;
    },
    set: (constructor: any, value: any) => {
      metadata.set(constructor, value);
      if (constructor.prototype?.constructor) {
        metadata.set(constructor.prototype.constructor, value);
      }
    },
    clear: () => metadata.clear(),
  };

  return {
    ...originalModule,
    indexMetadataMap: mockMetadataMap,
    Field,
    OpenSearchIndex,
  };
});

jest.mock("../client", () => {
  const existingIndices = new Set<string>();

  return {
    opensearchClient: {
      index: jest.fn().mockResolvedValue({
        body: {
          _id: "test_id",
          result: "created",
        },
      }),
      update: jest.fn().mockResolvedValue({
        body: {
          _id: "test_id",
          result: "updated",
        },
      }),
      indices: {
        exists: jest.fn().mockImplementation(({ index }: { index: string }) => {
          return Promise.resolve({ body: existingIndices.has(index) });
        }),
        delete: jest.fn().mockImplementation(({ index }: { index: string }) => {
          existingIndices.delete(index);
          return Promise.resolve({ body: { acknowledged: true } });
        }),
        create: jest.fn().mockImplementation(({ index }: { index: string }) => {
          existingIndices.add(index);
          return Promise.resolve({ body: { acknowledged: true } });
        }),
        getMapping: jest
          .fn()
          .mockImplementation(({ index }: { index: string }) => {
            const mappings: Record<string, any> = {
              test_migration_schema: {
                mappings: {
                  properties: {
                    name: { type: "keyword" },
                    age: { type: "integer" },
                  },
                },
              },
              test_migration_execution: {
                mappings: {
                  properties: {
                    name: { type: "keyword" },
                  },
                },
              },
              ".typensearch-migrations": {
                mappings: {
                  properties: {
                    migrationId: { type: "keyword" },
                    timestamp: { type: "date" },
                    success: { type: "boolean" },
                  },
                },
              },
            };
            return Promise.resolve({
              body: {
                [index]: mappings[index] || { mappings: { properties: {} } },
              },
            });
          }),
        putMapping: jest
          .fn()
          .mockResolvedValue({ body: { acknowledged: true } }),
        putAlias: jest.fn().mockResolvedValue({ body: { acknowledged: true } }),
        refresh: jest.fn().mockResolvedValue({ body: { acknowledged: true } }),
      },
      search: jest.fn().mockImplementation(({ index }: { index: string }) => {
        if (index === MIGRATION_INDEX) {
          return Promise.resolve({
            body: {
              hits: {
                total: { value: 1 },
                hits: [
                  {
                    _source: {
                      migrationId: "test_migration_id",
                      timestamp: new Date(),
                      success: true,
                      backupIndex: "test_backup_index",
                    },
                  },
                ],
              },
            },
          });
        }
        return Promise.resolve({
          body: {
            hits: {
              total: { value: 1 },
              hits: [{ _source: { name: "Test" } }],
            },
          },
        });
      }),
      reindex: jest
        .fn()
        .mockResolvedValue({ body: { created: 1, updated: 0, total: 1 } }),
      bulk: jest.fn().mockResolvedValue({
        body: {
          took: 30,
          errors: false,
          items: [],
        },
      }),
    },
    initialize: jest.fn(),
  };
});

describe("Migration", () => {
  beforeAll(async () => {
    await initialize({
      node: "http://localhost:9200",
      ssl: {
        rejectUnauthorized: false,
      },
    });
  });

  afterAll(async () => {
    // 모킹된 함수들의 호출 상태 초기화
    jest.clearAllMocks();

    // 테스트에서 사용한 인덱스 정리
    const indices = [
      "test_migration_schema",
      "test_migration_execution",
      "test_migration_rollback",
      "test_migration_large_data",
    ];

    for (const index of indices) {
      try {
        const exists = await opensearchClient.indices.exists({ index });
        if (exists.body) {
          await opensearchClient.indices.delete({ index });
        }
      } catch (error) {
        console.error(`Failed to delete index ${index}:`, error);
      }
    }
  });

  describe("Schema Change Detection", () => {
    @OpenSearchIndex({ name: "test_migration_schema" })
    class TestModel extends Model {
      @Field({ type: "keyword" })
      name: string;

      @Field({ type: "integer" })
      age: number;
    }

    beforeEach(async () => {
      // 각 테스트 전에 인덱스 초기화
      try {
        await opensearchClient.indices.delete({
          index: "test_migration_schema",
        });
      } catch (error) {}

      await TestModel.migrate();
    });

    it("should detect added fields", async () => {
      @OpenSearchIndex({ name: "test_migration_schema" })
      class UpdatedModel extends Model {
        @Field({ type: "keyword" })
        name: string;

        @Field({ type: "integer" })
        age: number;

        @Field({ type: "text" })
        description: string;
      }

      const plan = await UpdatedModel.planMigration();
      expect(plan.addedFields).toContain("description");
      expect(plan.modifiedFields).toHaveLength(0);
      expect(plan.deletedFields).toHaveLength(0);
      expect(plan.requiresReindex).toBe(false);
    });

    it("should detect modified fields", async () => {
      @OpenSearchIndex({ name: "test_migration_schema" })
      class ModifiedModel extends Model {
        @Field({ type: "keyword" })
        name: string;

        @Field({ type: "long" }) // integer에서 long으로 변경
        age: number;
      }

      const plan = await ModifiedModel.planMigration();
      expect(plan.modifiedFields).toContain("age");
      expect(plan.addedFields).toHaveLength(0);
      expect(plan.deletedFields).toHaveLength(0);
      expect(plan.requiresReindex).toBe(true);
      expect(plan.details.age.oldType).toBe("integer");
      expect(plan.details.age.newType).toBe("long");
    });

    it("should detect deleted fields", async () => {
      @OpenSearchIndex({ name: "test_migration_schema" })
      class ReducedModel extends Model {
        @Field({ type: "keyword" })
        name: string;
      }

      const plan = await ReducedModel.planMigration();
      expect(plan.deletedFields).toContain("age");
      expect(plan.addedFields).toHaveLength(0);
      expect(plan.modifiedFields).toHaveLength(0);
      expect(plan.requiresReindex).toBe(true);
      expect(plan.details.age.type).toBe("deleted");
      expect(plan.details.age.oldType).toBe("integer");
    });
  });

  describe("Migration Execution", () => {
    @OpenSearchIndex({ name: "test_migration_execution" })
    class InitialModel extends Model {
      @Field({ type: "keyword" })
      name: string;
    }

    beforeEach(async () => {
      try {
        await opensearchClient.indices.delete({
          index: "test_migration_execution",
        });
      } catch (error) {}

      await InitialModel.migrate();
    });

    it("should execute migration with dry run", async () => {
      @OpenSearchIndex({ name: "test_migration_execution" })
      class ExtendedModel extends Model {
        @Field({ type: "keyword" })
        name: string;

        @Field({ type: "text" })
        description: string;
      }

      const result = await ExtendedModel.migrate({ dryRun: true });
      expect(result.success).toBe(true);
      expect(result.migrationId).toBe("dry-run");

      // 실제로 변경되지 않았는지 확인
      const mapping = await opensearchClient.indices.getMapping({
        index: "test_migration_execution",
      });
      expect(
        mapping.body.test_migration_execution.mappings.properties.description
      ).toBeUndefined();
    });

    it("should execute migration with backup", async () => {
      // 초기 데이터 추가
      await InitialModel.index({ name: "Test" }, true);

      @OpenSearchIndex({ name: "test_migration_execution" })
      class ExtendedModel extends Model {
        @Field({ type: "keyword" })
        name: string;

        @Field({ type: "text" })
        description: string;
      }

      const result = await ExtendedModel.migrate({ backup: true });
      expect(result.success).toBe(true);
      expect(result.backupIndex).toBeDefined();

      const backupExists = await opensearchClient.indices.exists({
        index: result.backupIndex!,
      });
      expect(backupExists.body).toBe(true);

      const backupData = await opensearchClient.search({
        index: result.backupIndex!,
      });
      expect(backupData.body.hits.total.value).toBe(1);
      expect(backupData.body.hits.hits[0]._source.name).toBe("Test");
    });

    it("should handle migration errors gracefully", async () => {
      @OpenSearchIndex({ name: "test_migration_execution" })
      class InvalidModel extends Model {
        @Field({ type: "invalid_type" as any })
        name: string;
      }

      await expect(InvalidModel.migrate()).rejects.toThrow();
    });
  });

  describe("Rollback", () => {
    @OpenSearchIndex({ name: "test_migration_rollback" })
    class InitialModel extends Model {
      @Field({ type: "keyword" })
      name: string;
    }

    beforeEach(async () => {
      try {
        await opensearchClient.indices.delete({
          index: "test_migration_rollback",
        });
      } catch (error) {}

      await InitialModel.migrate();
    });

    it("should rollback migration", async () => {
      await InitialModel.index({ name: "Test" }, true);

      @OpenSearchIndex({ name: "test_migration_rollback" })
      class ExtendedModel extends Model {
        @Field({ type: "keyword" })
        name: string;

        @Field({ type: "text" })
        description: string;
      }

      const migrationResult = await ExtendedModel.migrate({ backup: true });
      expect(migrationResult.success).toBe(true);

      await ExtendedModel.index(
        { name: "Test2", description: "Description" },
        true
      );

      const mockSearch = opensearchClient.search as jest.Mock;
      mockSearch.mockImplementationOnce(() => {
        return Promise.resolve({
          body: {
            hits: {
              total: { value: 1 },
              hits: [
                {
                  _source: {
                    migrationId: migrationResult.migrationId,
                    timestamp: new Date(),
                    success: true,
                    backupIndex: migrationResult.backupIndex,
                    plan: {
                      indexName: "test_migration_rollback",
                      addedFields: ["description"],
                      modifiedFields: [],
                      deletedFields: [],
                      requiresReindex: false,
                      estimatedDuration: "1-2 minutes",
                      details: {
                        description: {
                          type: "added",
                          newType: "text",
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
        });
      });

      const rollbackResult = await ExtendedModel.rollback(
        migrationResult.migrationId
      );
      expect(rollbackResult.success).toBe(true);

      const mapping = await opensearchClient.indices.getMapping({
        index: "test_migration_rollback",
      });
      expect(
        mapping.body.test_migration_rollback.mappings.properties.description
      ).toBeUndefined();

      const data = await opensearchClient.search({
        index: "test_migration_rollback",
      });
      expect(data.body.hits.total.value).toBe(1);
      expect(data.body.hits.hits[0]._source.name).toBe("Test");

      mockSearch.mockImplementationOnce(() => {
        return Promise.resolve({
          body: {
            hits: {
              total: { value: 1 },
              hits: [
                {
                  _source: {
                    migrationId: migrationResult.migrationId,
                    timestamp: new Date(),
                    success: true,
                    backupIndex: migrationResult.backupIndex,
                    plan: {
                      indexName: "test_migration_rollback",
                      addedFields: ["description"],
                      modifiedFields: [],
                      deletedFields: [],
                      requiresReindex: false,
                      estimatedDuration: "1-2 minutes",
                      details: {
                        description: {
                          type: "added",
                          newType: "text",
                        },
                      },
                    },
                    rolledBack: {
                      timestamp: new Date(),
                      success: true,
                    },
                  },
                },
              ],
            },
          },
        });
      });

      const history = await ExtendedModel.getMigrationHistory();
      expect(history[0].rolledBack).toBeDefined();
      expect(history[0].rolledBack!.success).toBe(true);
    });

    it("should handle rollback errors", async () => {
      await expect(InitialModel.rollback("non-existent-id")).rejects.toThrow(
        "[typensearch] Migration non-existent-id not found"
      );
    });
  });

  describe("Large Data Migration", () => {
    beforeEach(async () => {
      try {
        await opensearchClient.indices.delete({
          index: "test_migration_large_data",
        });
      } catch (error) {}

      @OpenSearchIndex({ name: "test_migration_large_data" })
      class LogModel extends Model {
        @Field({ type: "keyword" })
        level: string;

        @Field({ type: "text" })
        message: string;
      }

      // Register metadata for LogModel
      indexMetadataMap.clear();
      indexMetadataMap.set(LogModel, {
        name: "test_migration_large_data",
        properties: {
          level: { type: "keyword" },
          message: { type: "text" },
        },
      });

      await LogModel.migrate();
    });

    it("should handle large data migration", async () => {
      @OpenSearchIndex({ name: "test_migration_large_data" })
      class ExtendedLogModel extends Model {
        @Field({ type: "keyword" })
        level: string;

        @Field({ type: "text" })
        message: string;

        @Field({ type: "date" })
        timestamp: Date;
      }

      // Register metadata for ExtendedLogModel
      indexMetadataMap.set(ExtendedLogModel, {
        name: "test_migration_large_data",
        properties: {
          level: { type: "keyword" },
          message: { type: "text" },
          timestamp: { type: "date" },
        },
      });

      const plan = await ExtendedLogModel.planMigration();
      expect(plan.addedFields).toContain("timestamp");
      expect(plan.modifiedFields).toHaveLength(0);
      expect(plan.deletedFields).toHaveLength(0);
      expect(plan.requiresReindex).toBe(false);
    });
  });
});
