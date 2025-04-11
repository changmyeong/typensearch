import { ApiResponse } from "@opensearch-project/opensearch";
import { opensearchClient } from "./client";
import { indexMetadataMap } from "./decorator";
import {
  MigrationOptions,
  MigrationPlan,
  MigrationResult,
  MigrationHistory,
  FieldOptions,
  IndexMetadata,
} from "./types";
import { v4 as uuidv4 } from "uuid";

export const MIGRATION_INDEX = ".typensearch-migrations";

function getIndexMetadata(modelClass: any): IndexMetadata {
  const metadata = indexMetadataMap.get(modelClass);
  if (!metadata) {
    throw new Error("[typensearch] No metadata found for model");
  }
  return metadata;
}

export async function getCurrentMapping(
  indexName: string
): Promise<Record<string, any>> {
  try {
    const response = await opensearchClient.indices.getMapping({
      index: indexName,
    });
    return response.body[indexName].mappings.properties || {};
  } catch (error) {
    return {};
  }
}

export async function compareSchemas(
  indexName: string,
  currentMapping: any,
  metadata: IndexMetadata
): Promise<MigrationPlan> {
  const currentFields = Object.keys(currentMapping || {});
  const newFields = Object.keys(metadata.properties);

  const addedFields = newFields.filter((f) => !currentFields.includes(f));
  const deletedFields = currentFields.filter((f) => !newFields.includes(f));
  const modifiedFields = newFields.filter((f) => {
    if (!currentFields.includes(f)) return false;
    const currentField = currentMapping[f];
    const { __meta: _, ...newField } = metadata.properties[f];
    return (
      currentField.type !== newField.type ||
      JSON.stringify(currentField.fields) !== JSON.stringify(newField.fields) ||
      JSON.stringify(currentField.properties) !==
        JSON.stringify(newField.properties)
    );
  });

  const requiresReindex = modifiedFields.length > 0 || deletedFields.length > 0;
  const estimatedDuration = requiresReindex ? "5-10 minutes" : "1-2 minutes";

  const details: Record<
    string,
    {
      type: "added" | "modified" | "deleted";
      oldType?: string;
      newType?: string;
      oldOptions?: Partial<FieldOptions>;
      newOptions?: Partial<FieldOptions>;
    }
  > = {};

  addedFields.forEach((field) => {
    const { __meta: _, ...newOptions } = metadata.properties[field];
    details[field] = {
      type: "added",
      newType: newOptions.type,
      newOptions,
    };
  });

  modifiedFields.forEach((field) => {
    const { __meta: _, ...newOptions } = metadata.properties[field];
    details[field] = {
      type: "modified",
      oldType: currentMapping[field].type,
      newType: newOptions.type,
      oldOptions: currentMapping[field],
      newOptions,
    };
  });

  deletedFields.forEach((field) => {
    details[field] = {
      type: "deleted",
      oldType: currentMapping[field].type,
      oldOptions: currentMapping[field],
    };
  });

  return {
    indexName,
    addedFields,
    modifiedFields,
    deletedFields,
    requiresReindex,
    estimatedDuration,
    details,
  };
}

export async function createBackup(
  indexName: string,
  migrationId: string
): Promise<string> {
  const backupIndex = `${indexName}_backup_${migrationId}`;

  const currentMapping = await getCurrentMapping(indexName);
  await opensearchClient.indices.create({
    index: backupIndex,
    body: {
      mappings: {
        properties: currentMapping,
      },
    },
  });

  await opensearchClient.reindex({
    body: {
      source: {
        index: indexName,
      },
      dest: {
        index: backupIndex,
      },
    },
    wait_for_completion: true,
    timeout: "1h",
    refresh: true,
  });

  return backupIndex;
}

export async function executeMigration(
  modelClass: any,
  plan: MigrationPlan,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const startTime = Date.now();
  const migrationId = uuidv4();
  let backupIndex: string | undefined;
  let tempIndex: string | undefined;

  try {
    const metadata = getIndexMetadata(modelClass);
    const indexName = metadata.name!;

    // 타입 검증
    const validTypes = [
      "text",
      "keyword",
      "long",
      "integer",
      "short",
      "byte",
      "double",
      "float",
      "date",
      "boolean",
      "binary",
      "object",
      "nested",
    ];
    for (const [field, options] of Object.entries(metadata.properties)) {
      if (!validTypes.includes(options.type)) {
        throw new Error(
          `[typensearch] Invalid field type "${options.type}" for field "${field}"`
        );
      }
    }

    // 백업 생성
    if (options.backup) {
      backupIndex = await createBackup(indexName, migrationId);
    }

    if (plan.requiresReindex) {
      // 새 인덱스 생성
      tempIndex = `${indexName}_new_${migrationId}`;
      await opensearchClient.indices.create({
        index: tempIndex,
        body: {
          mappings: {
            properties: Object.fromEntries(
              Object.entries(metadata.properties).map(([field, options]) => [
                field,
                { type: options.type },
              ])
            ),
          },
        },
      });

      // 데이터 재색인
      await opensearchClient.reindex({
        body: {
          source: {
            index: indexName,
          },
          dest: {
            index: tempIndex,
          },
        },
        wait_for_completion: options.waitForCompletion ?? true,
        timeout: options.timeout || "1h",
        refresh: true,
      });

      // 별칭 업데이트
      await opensearchClient.indices.updateAliases({
        body: {
          actions: [
            { remove: { index: indexName, alias: "current" } },
            { add: { index: tempIndex, alias: "current" } },
          ],
        },
      });

      // 이전 인덱스 삭제
      await opensearchClient.indices.delete({
        index: indexName,
      });

      // 새 인덱스 이름 변경
      await opensearchClient.indices.putAlias({
        index: tempIndex,
        name: indexName,
      });
    } else {
      // 필드 추가만 필요한 경우
      await opensearchClient.indices.putMapping({
        index: indexName,
        body: {
          properties: Object.fromEntries(
            plan.addedFields.map((field) => [
              field,
              { type: metadata.properties[field].type },
            ])
          ),
        },
      });
    }

    const result: MigrationResult = {
      success: true,
      duration: Date.now() - startTime,
      migrationId,
      timestamp: new Date(),
      plan,
      backupIndex,
    };

    // 마이그레이션 이력 저장
    await saveMigrationHistory(result);

    return result;
  } catch (error) {
    const result: MigrationResult = {
      success: false,
      duration: Date.now() - startTime,
      migrationId,
      timestamp: new Date(),
      plan,
      error: error instanceof Error ? error.message : String(error),
      backupIndex,
    };

    // 실패 시 마이그레이션 이력 저장
    await saveMigrationHistory(result);

    // 롤백 로직
    if (backupIndex) {
      try {
        await opensearchClient.reindex({
          body: {
            source: {
              index: backupIndex,
            },
            dest: {
              index: plan.indexName,
            },
          },
          wait_for_completion: true,
          timeout: "1h",
          refresh: true,
        });
      } catch (rollbackError) {
        console.error("Failed to rollback migration:", rollbackError);
      }
    }

    throw error;
  }
}

export async function rollbackMigration(
  migrationId: string
): Promise<MigrationResult> {
  const history = await getMigrationHistory();
  const migration = history.find((m) => m.migrationId === migrationId);

  if (!migration) {
    throw new Error(`[typensearch] Migration ${migrationId} not found`);
  }

  if (!migration.backupIndex) {
    throw new Error(
      `[typensearch] No backup found for migration ${migrationId}`
    );
  }

  if (migration.rolledBack) {
    throw new Error(
      `[typensearch] Migration ${migrationId} has already been rolled back`
    );
  }

  const startTime = Date.now();
  const indexName = migration.plan.indexName;

  try {
    // 현재 인덱스 존재 여부 확인
    const indexExists = await opensearchClient.indices.exists({
      index: indexName,
    });

    if (indexExists.body) {
      await opensearchClient.indices.delete({ index: indexName });
    }

    // 백업에서 복구
    await opensearchClient.reindex({
      body: {
        source: {
          index: migration.backupIndex,
        },
        dest: {
          index: indexName,
        },
      },
      wait_for_completion: true,
      timeout: "1h",
    });

    // 백업 인덱스 삭제
    await opensearchClient.indices.delete({ index: migration.backupIndex });

    const result: MigrationResult = {
      success: true,
      duration: Date.now() - startTime,
      migrationId,
      timestamp: new Date(),
      plan: migration.plan,
    };

    // 롤백 정보 저장
    await updateMigrationHistory(migrationId, {
      rolledBack: {
        timestamp: new Date(),
        success: true,
      },
    });

    return result;
  } catch (error: any) {
    const result: MigrationResult = {
      success: false,
      duration: Date.now() - startTime,
      errors: [error],
      migrationId,
      timestamp: new Date(),
      plan: migration.plan,
    };

    // 실패한 롤백 정보 저장
    await updateMigrationHistory(migrationId, {
      rolledBack: {
        timestamp: new Date(),
        success: false,
        errors: [error],
      },
    });

    throw error;
  }
}

async function saveMigrationHistory(history: MigrationHistory): Promise<void> {
  try {
    await opensearchClient.index({
      index: MIGRATION_INDEX,
      id: history.migrationId,
      body: history,
      refresh: true,
    });
  } catch (error: any) {
    if (error.statusCode === 404) {
      // 마이그레이션 인덱스가 없으면 생성
      await opensearchClient.indices.create({
        index: MIGRATION_INDEX,
        body: {
          mappings: {
            properties: {
              migrationId: { type: "keyword" },
              timestamp: { type: "date" },
              plan: { type: "object" },
              result: { type: "object" },
              backupIndex: { type: "keyword" },
              rolledBack: {
                type: "object",
                properties: {
                  timestamp: { type: "date" },
                  success: { type: "boolean" },
                  errors: { type: "object" },
                },
              },
            },
          },
        },
      });
      await opensearchClient.index({
        index: MIGRATION_INDEX,
        id: history.migrationId,
        body: history,
        refresh: true,
      });
    } else {
      throw error;
    }
  }
}

async function updateMigrationHistory(
  migrationId: string,
  update: Partial<MigrationHistory>
): Promise<void> {
  await opensearchClient.update({
    index: MIGRATION_INDEX,
    id: migrationId,
    body: {
      doc: update,
    },
    refresh: true,
  });
}

export async function getMigrationHistory(): Promise<MigrationHistory[]> {
  try {
    const response = await opensearchClient.search({
      index: MIGRATION_INDEX,
      body: {
        sort: [{ timestamp: "desc" }],
        size: 100,
      },
    });

    return response.body.hits.hits.map((hit: any) => hit._source);
  } catch (error: any) {
    if (error.statusCode === 404) {
      return [];
    }
    throw error;
  }
}
