import { FieldOptions, IndexMetadata, IndexOptions } from './types';

export const indexMetadataMap = new Map<Function, IndexMetadata>();
export function Field(options?: FieldOptions): PropertyDecorator {
  return function (target: any, propertyKey: string) {
    const metadata: IndexMetadata = indexMetadataMap.get(target.constructor) || {
      properties: {},
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
  return function (constructor: Function) {
    // for setting index name and node
    indexMetadataMap.set(constructor, {
      ...indexMetadataMap.get(constructor),
      name: (options.name || constructor.name).toLowerCase(),
      numberOfShards: options.numberOfShards || 2,
      numberOfReplicas: options.numberOfReplicas || 1,
    });
  };
}