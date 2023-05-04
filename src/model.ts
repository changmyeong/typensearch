import { Client, ApiResponse } from '@opensearch-project/opensearch';
import { UpdateOptions, DeleteOptions } from './types';
import { opensearchClient } from './client';
import { indexMetadataMap } from './decorator';
import { camelToSnakeObj } from './util';

export abstract class Model {
  public _id: string | undefined;
  public client: Client;

  public static async index<T extends Model>(this: new () => T, doc: Partial<T>, refresh?: boolean): Promise<ApiResponse> {
    const metadata = indexMetadataMap.get(this.prototype.constructor);
    const requiredFields = Object.entries(metadata.properties)
      .filter(([_, options]) => options.required)
      .map(([key]) => key);

    for (const field of requiredFields) {
      if (!(field in doc)) {
        throw new Error(`[typesearch] index: Required field "${field}" is missing`);
      }
    }

    const instance: any = new this();
    for (const [key, value] of Object.entries(doc)) {
      instance[key] = value;
    }

    const { _id, ...others } = doc;
    return opensearchClient.index({
      index: metadata.name,
      id: _id,
      body: others,
      refresh,
    });
  }

  public static async updateMany<T extends Model>(this: new () => T, query: Partial<T>, updates: Partial<T>, options?: UpdateOptions): Promise<ApiResponse> {
    const metadata = indexMetadataMap.get(this.prototype.constructor);

    const body = {
      script: {
        source: Object.entries(updates).map(([key, value]) => `ctx._source.${key} = '${value}';`).join('\n'),
        lang: 'painless',
      },
      query: {
        match: query,
      },
    };
  
    return opensearchClient.updateByQuery({
      index: metadata.name,
      body,
      ...camelToSnakeObj(options),
    });
  }

  public static async deleteMany<T extends Model>(this: new () => T, query: Partial<T>, options?: DeleteOptions): Promise<ApiResponse> {
    const metadata = indexMetadataMap.get(this.prototype.constructor);

    return opensearchClient.deleteByQuery({
      index: metadata.name,
      body: {
        query: {
          match: query,
        },
      },
      ...camelToSnakeObj(options),
    });
  }

  public static async get<T extends Model>(this: new () => T, id: string): Promise<T | null> {
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

  public async delete(): Promise<ApiResponse> {
    const metadata = indexMetadataMap.get(this.constructor);
    if (!metadata) {
      throw new Error('[typesearch] delete: No metadata found for schema');
    }

    return opensearchClient.delete({
      index: metadata.name,
      id: this._id,
    });
  }
}