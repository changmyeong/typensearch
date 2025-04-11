import { IndexOptions, FieldOptions } from "./types";

export class MetadataStorage {
  private static instance: MetadataStorage;
  private indexMetadata: Map<Function, { options: IndexOptions }>;
  private fieldMetadata: Map<
    Function,
    Array<{ propertyKey: string; options: FieldOptions }>
  >;

  private constructor() {
    this.indexMetadata = new Map();
    this.fieldMetadata = new Map();
  }

  public static getInstance(): MetadataStorage {
    if (!MetadataStorage.instance) {
      MetadataStorage.instance = new MetadataStorage();
    }
    return MetadataStorage.instance;
  }

  public addIndexMetadata(target: Function, options: IndexOptions) {
    this.indexMetadata.set(target, { options });
  }

  public getIndexMetadata(target: Function) {
    return this.indexMetadata.get(target);
  }

  public addFieldMetadata(
    target: Function,
    propertyKey: string,
    options: FieldOptions
  ) {
    const existingMetadata = this.fieldMetadata.get(target) || [];
    existingMetadata.push({ propertyKey, options });
    this.fieldMetadata.set(target, existingMetadata);
  }

  public getFieldMetadata(target: Function) {
    return this.fieldMetadata.get(target) || [];
  }
}
