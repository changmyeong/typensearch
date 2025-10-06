import { FieldOptions, IndexMetadata, IndexOptions } from "./types";

export const indexMetadataMap = new Map<Function, IndexMetadata>();

export function Field(options?: FieldOptions): PropertyDecorator {
  return function (target: any, propertyKey: string) {
    const metadata: IndexMetadata = indexMetadataMap.get(
      target.constructor
    ) || {
      properties: {},
    };

    options =
      options ||
      ({
        type: "keyword",
        required: false,
      } as FieldOptions);

    const { type, required, properties, validate, ...fieldOptions } = options;
    delete fieldOptions.default;

    metadata.properties[propertyKey] = {
      type,
      required,
      default: options.default,
      properties,
      validate,
      options: fieldOptions,
    };

    indexMetadataMap.set(target.constructor, metadata);
  };
}

export function OpenSearchIndex(options?: IndexOptions): ClassDecorator {
  return function (constructor: Function) {
    const existingMetadata = indexMetadataMap.get(constructor) || {
      properties: {},
    };
    indexMetadataMap.set(constructor, {
      ...existingMetadata,
      name: (options?.name || constructor.name).toLowerCase(),
      numberOfShards: options?.numberOfShards,
      numberOfReplicas: options?.numberOfReplicas,
    });
  };
}
