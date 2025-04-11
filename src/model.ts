import { ApiResponse } from "@opensearch-project/opensearch";
import {
  UpdateOptions,
  DeleteOptions,
  BulkResponse,
  BulkOptions,
  MigrationOptions,
  MigrationPlan,
  MigrationResult,
  MigrationHistory,
  FieldOptions,
  FieldType,
  IndexMetadata,
  QueryBuilder,
} from "./types";
import { opensearchClient } from "./client";
import { indexMetadataMap } from "./decorator";
import { convertOptionsToMappingProperties } from "./util";
import {
  getCurrentMapping,
  compareSchemas,
  executeMigration,
  rollbackMigration,
  getMigrationHistory,
} from "./migration";
import { QueryBuilderImpl } from "./query";
import { BatchProcessor } from "./batch";
import { Client } from "@opensearch-project/opensearch";
import { MetadataStorage } from "./metadata";
import { IndexOptions } from "./types";

export abstract class Model {
  public _id: string | undefined;
  [property: string]: any;

  static client: Client;

  public static async index<T extends Model>(
    this: new () => T,
    doc: Partial<T>,
    refresh?: boolean
  ): Promise<T> {
    if (!opensearchClient) {
      throw new Error(
        "[typesearch] You have to call `initialize` method first"
      );
    }

    const metadata = indexMetadataMap.get(this.prototype.constructor);

    const instance: any = new this();
    const indexDoc: any = {};
    for (const [propertyName, options] of Object.entries(metadata.properties)) {
      if (propertyName in doc) {
        const value = doc[propertyName as string];
        instance[propertyName] = value;
        indexDoc[propertyName] = value;
      } else if ("default" in options) {
        const value =
          typeof options.default === "function"
            ? options.default()
            : options.default;
        instance[propertyName] = value;
        indexDoc[propertyName] = value;
      } else if (options.required) {
        throw new Error(
          `[typesearch] index: Required field "${propertyName}" is missing`
        );
      }
    }

    const { _id, ...others } = indexDoc;
    const response = await opensearchClient
      .index({
        index: metadata.name,
        id: _id,
        body: others,
        refresh,
      })
      .catch((error) => {
        throw error;
      });

    if (!["created", "updated"].includes(response.body.result)) {
      throw response.body;
    }

    instance._id = response.body._id;
    return instance;
  }

  public static async updateMany<T extends Model>(
    this: new () => T,
    query: Partial<T>,
    updates: Partial<T>,
    options?: UpdateOptions
  ): Promise<ApiResponse> {
    if (!opensearchClient) {
      throw new Error(
        "[typesearch] You have to call `initialize` method first"
      );
    }

    const metadata = indexMetadataMap.get(this.prototype.constructor);
    if (!metadata) {
      throw new Error("[typesearch] No metadata found for model");
    }

    const body = {
      script: {
        source: Object.entries(updates)
          .map(([key, value]) => {
            if (typeof value === "string") {
              return `ctx._source.${key} = '${value.replace(/'/g, "\\'")}'`;
            } else if (value === null) {
              return `ctx._source.${key} = null`;
            } else if (typeof value === "object") {
              if (!metadata.properties[key]) {
                throw new Error(`[typesearch] Unknown field "${key}"`);
              }
              if (metadata.properties[key].type === "nested") {
                return `ctx._source.${key} = params.${key}`;
              } else {
                const props = Object.entries(value).map(
                  ([subKey, subValue]) => {
                    if (typeof subValue === "string") {
                      return `ctx._source.${key}.${subKey} = '${subValue.replace(
                        /'/g,
                        "\\'"
                      )}'`;
                    } else if (subValue === null) {
                      return `ctx._source.${key}.${subKey} = null`;
                    } else {
                      return `ctx._source.${key}.${subKey} = ${JSON.stringify(
                        subValue
                      )}`;
                    }
                  }
                );
                return props.join(";\n");
              }
            } else {
              return `ctx._source.${key} = ${JSON.stringify(value)}`;
            }
          })
          .join(";\n"),
        lang: "painless",
        params: Object.entries(updates).reduce((acc, [key, value]) => {
          if (
            typeof value === "object" &&
            metadata.properties[key]?.type === "nested"
          ) {
            acc[key] = value;
          }
          return acc;
        }, {} as Record<string, any>),
      },
      query: {
        match: query,
      },
    };

    return opensearchClient.updateByQuery({
      index: metadata.name!,
      body,
      ...convertOptionsToMappingProperties(options),
    });
  }

  public static async deleteMany<T extends Model>(
    this: new () => T,
    query: Partial<T>,
    options?: DeleteOptions
  ): Promise<ApiResponse> {
    if (!opensearchClient) {
      throw new Error(
        "[typesearch] You have to call `initialize` method first"
      );
    }

    const metadata = indexMetadataMap.get(this.prototype.constructor);
    if (!metadata) {
      throw new Error("[typesearch] No metadata found for model");
    }

    return opensearchClient.deleteByQuery({
      index: metadata.name!,
      body: {
        query: {
          match: query,
        },
      },
      ...convertOptionsToMappingProperties(options),
    });
  }

  public static async get<T extends Model>(
    this: new () => T,
    id: string
  ): Promise<T | null> {
    if (!opensearchClient) {
      throw new Error(
        "[typesearch] You have to call `initialize` method first"
      );
    }

    const metadata = indexMetadataMap.get(this.prototype.constructor);
    if (!metadata) {
      throw new Error("[typesearch] No metadata found for model");
    }

    try {
      const { body } = await opensearchClient.get({
        index: metadata.name!,
        id,
      });

      if (body.found) {
        const instance = new this();
        Object.assign(instance, body._source);
        instance._id = body._id;
        return instance;
      }
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }

    return null;
  }

  public static query<T extends Model>(this: new () => T): QueryBuilder<T> {
    const metadata = indexMetadataMap.get(this);
    if (!metadata) {
      throw new Error("[typesearch] No metadata found for model");
    }
    return new QueryBuilderImpl<T>(opensearchClient, metadata.name!);
  }

  public static async search<T extends Model>(
    this: new () => T,
    body: Record<string, any>,
    size?: number
  ) {
    if (!opensearchClient) {
      throw new Error(
        "[typensearch] You have to call `initialize` method first"
      );
    }

    const metadata = indexMetadataMap.get(this);

    const result = await opensearchClient.search({
      index: metadata.name,
      body,
      size,
    });

    return result;
  }

  public static async count<T extends Model>(
    this: new () => T,
    body: Record<string, any>
  ): Promise<number> {
    if (!opensearchClient) {
      throw new Error(
        "[typesearch] You have to call `initialize` method first"
      );
    }

    const metadata = indexMetadataMap.get(this);

    const result = await opensearchClient.count({
      index: metadata.name,
      body,
    });

    return result.body.count;
  }

  public async save(refresh?: boolean): Promise<void> {
    if (!opensearchClient) {
      throw new Error(
        "[typesearch] You have to call `initialize` method first"
      );
    }

    if (!this._id) {
      throw new Error(
        "[typesearch] save: Cannot save a document without an _id"
      );
    }

    const metadata = indexMetadataMap.get(this.constructor);
    if (!metadata) {
      throw new Error("[typesearch] save: No metadata found for schema");
    }

    const { _id, ...others } = this;
    try {
      const { body } = await opensearchClient.update({
        index: metadata.name!,
        id: this._id,
        body: {
          doc: others,
        },
        refresh,
      });

      if (body.result !== "updated" && body.result !== "noop") {
        throw new Error(
          `[typesearch] save: Failed to update document: ${body.result}`
        );
      }
    } catch (error: any) {
      if (error.statusCode === 404) {
        throw new Error(
          `[typesearch] save: Document with id ${this._id} not found`
        );
      }
      throw error;
    }
  }

  public async delete(): Promise<ApiResponse> {
    if (!opensearchClient) {
      throw new Error(
        "[typesearch] You have to call `initialize` method first"
      );
    }

    const metadata = indexMetadataMap.get(this.constructor);
    if (!metadata) {
      throw new Error("[typesearch] delete: No metadata found for schema");
    }

    return opensearchClient.delete({
      index: metadata.name,
      id: this._id,
    });
  }

  public static async delete(id: string, refresh?: boolean): Promise<void> {
    if (!opensearchClient) {
      throw new Error(
        "[typesearch] You have to call `initialize` method first"
      );
    }

    const metadata = indexMetadataMap.get(this.constructor);
    if (!metadata) {
      throw new Error("[typesearch] delete: No metadata found for schema");
    }

    const { body } = await opensearchClient.delete({
      index: metadata.name,
      id,
      refresh,
    });

    if (body.result !== "deleted") {
      throw body;
    }
  }

  public static async bulkIndex<T extends Model>(
    this: new () => T,
    docs: Partial<T>[],
    options: BulkOptions = {}
  ): Promise<BulkResponse> {
    const batchProcessor = BatchProcessor.getInstance();
    return batchProcessor.bulkIndex(this, docs, options);
  }

  public static async bulkDelete<T extends Model>(
    this: new () => T,
    ids: string[],
    options: BulkOptions = {}
  ): Promise<BulkResponse> {
    const batchProcessor = BatchProcessor.getInstance();
    return batchProcessor.bulkDelete(this, ids, options);
  }

  public static async planMigration(): Promise<MigrationPlan> {
    const metadata = indexMetadataMap.get(this.prototype.constructor);
    if (!metadata) {
      throw new Error("[typensearch] No metadata found for model");
    }

    const currentMapping = await getCurrentMapping(metadata.name);

    return compareSchemas(metadata.name, currentMapping, metadata);
  }

  public static async migrate(
    this: typeof Model,
    options?: MigrationOptions
  ): Promise<MigrationResult> {
    if (!opensearchClient) {
      throw new Error(
        "[typensearch] You have to call `initialize` method first"
      );
    }

    const metadata = indexMetadataMap.get(this.prototype.constructor);
    const plan = await this.planMigration();

    if (options?.dryRun) {
      return {
        success: true,
        duration: 0,
        migrationId: "dry-run",
        timestamp: new Date(),
        plan,
      };
    }

    return executeMigration(this, plan, options);
  }

  public static async rollback(
    this: typeof Model,
    migrationId: string
  ): Promise<MigrationResult> {
    if (!opensearchClient) {
      throw new Error(
        "[typensearch] You have to call `initialize` method first"
      );
    }

    return rollbackMigration(migrationId);
  }

  public static async getMigrationHistory(
    this: typeof Model
  ): Promise<MigrationHistory[]> {
    if (!opensearchClient) {
      throw new Error(
        "[typensearch] You have to call `initialize` method first"
      );
    }

    return getMigrationHistory();
  }

  public validate(): void {
    const metadata = indexMetadataMap.get(this.constructor);
    if (!metadata) {
      throw new Error("[typesearch] No metadata found for model");
    }

    for (const [propertyName, options] of Object.entries(metadata.properties)) {
      const value = this[propertyName];

      if (options.required && value === undefined) {
        throw new Error(
          `[typesearch] Required field "${propertyName}" is missing`
        );
      }

      if (value !== undefined) {
        if (options.validate && !options.validate(value)) {
          throw new Error(
            `[typesearch] Validation failed for field "${propertyName}"`
          );
        }

        if (options.type === "object" || options.type === "nested") {
          if (value && options.properties) {
            for (const [subPropertyName, subOptions] of Object.entries(
              options.properties
            )) {
              const subValue = value[subPropertyName];
              if (subOptions.required && subValue === undefined) {
                throw new Error(
                  `[typesearch] Required field "${propertyName}.${subPropertyName}" is missing`
                );
              }
              if (
                subValue !== undefined &&
                subOptions.validate &&
                !subOptions.validate(subValue)
              ) {
                throw new Error(
                  `[typesearch] Validation failed for field "${propertyName}.${subPropertyName}"`
                );
              }
            }
          }
        }
      }
    }
  }

  public static getMapping() {
    const metadata = indexMetadataMap.get(this);
    if (!metadata) {
      throw new Error("[typesearch] No metadata found for model");
    }

    const mapping = {
      properties: {} as Record<string, any>,
    };

    for (const [propertyName, options] of Object.entries(metadata.properties)) {
      const { __meta, ...mappingOptions } = options;
      mapping.properties[propertyName] =
        convertOptionsToMappingProperties(mappingOptions);
    }

    return mapping;
  }
}
