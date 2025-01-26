import { ApiResponse } from "@opensearch-project/opensearch";
import { UpdateOptions, DeleteOptions } from "./types";
import { opensearchClient } from "./client";
import { indexMetadataMap } from "./decorator";
import { convertOptionsToMappingProperties } from "./util";

export abstract class Model {
  public _id: string | undefined;
  [property: string]: any;

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

    const body = {
      script: {
        source: Object.entries(updates)
          .map(([key, value]) => `ctx._source.${key} = '${value}';`)
          .join("\n"),
        lang: "painless",
      },
      query: {
        match: query,
      },
    };

    return opensearchClient.updateByQuery({
      index: metadata.name,
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

    return opensearchClient.deleteByQuery({
      index: metadata.name,
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

    const metadata = indexMetadataMap.get(this);

    const { body } = await opensearchClient.get({
      index: metadata.name,
      id,
    });

    if (body.found) {
      const instance: any = new this();
      for (const [key, value] of Object.entries(body._source)) {
        instance[key] = value;
      }

      return instance;
    } else {
      return null;
    }
  }

  public static async search<T extends Model>(
    this: new () => T,
    body: Record<string, any>,
    size?: number
  ) {
    if (!opensearchClient) {
      throw new Error(
        "[typesearch] You have to call `initialize` method first"
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
    const { body } = await opensearchClient.update({
      index: metadata.name,
      id: this._id,
      body: {
        doc: others,
      },
      refresh,
    });

    if (body.result !== "updated") {
      throw new Error(`[typesearch] save: Failed to update document`);
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
}
