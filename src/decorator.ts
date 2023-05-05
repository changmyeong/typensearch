import { FieldOptions, IndexMetadata, IndexOptions } from './types';
import { opensearchClient, setOpenSearchClient } from './client';
import { convertOptionsToMappingProperties } from './util';

export const indexMetadataMap = new Map<Function, IndexMetadata>();
export function Field(options?: FieldOptions): PropertyDecorator {
  return function (target: any, propertyKey: string) {
    const metadata: IndexMetadata = indexMetadataMap.get(target.constructor) || {
      name: '',
      properties: {},
      clientOptions: {},
    };
    options = options || {
      type: 'keyword',
      required: false,
    } as FieldOptions;

    const { type, required, ...fieldOptions } = options;
    delete fieldOptions.default;

    metadata.properties[propertyKey] = {
      type,
      required,
      default: options.default,
      options: fieldOptions,
    };

    indexMetadataMap.set(target.constructor, metadata);
  };
}

export function CreatedAt(): PropertyDecorator {
  return Field({ type: 'date', default: Date.now });
}

export function UpdatedAt(): PropertyDecorator {
  return Field({ type: 'date', default: Date.now });
}

export function OpenSearchIndex(options?: IndexOptions): ClassDecorator {
  if (!opensearchClient) {
    setOpenSearchClient(options.clientOptions);
  }

  return function (constructor: Function) {
    // for setting index name and node
    indexMetadataMap.set(constructor, {
      ...indexMetadataMap.get(constructor),
      name: (options.name || constructor.name).toLowerCase(),
      clientOptions: options.clientOptions,
    });
    const metadata = indexMetadataMap.get(constructor);

    if (options.createIfNotExists) {
      const mappingProperties: any = {};
      const { id, ...propertiesWithoutId } = metadata.properties;

      for (const [propertyName, values] of Object.entries(propertiesWithoutId)) {
        const { type, options } = values;
        mappingProperties[propertyName] = {
          type,
          ...convertOptionsToMappingProperties(options),
        };
      }

      opensearchClient.indices.get({ index: metadata.name }).catch((error) => {
        if (error.meta.body.error.type === 'index_not_found_exception') {
          opensearchClient.indices.create({
            index: options.name,
            body: {
              settings: {
                index: {
                  number_of_shards: options.numberOfShards || 2,
                  number_of_replicas: 1,
                }
              },
              mappings: {
                properties: mappingProperties,
              },
            },
          });
        }
      });
    }
  };
}