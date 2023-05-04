import { ClientOptions } from '@opensearch-project/opensearch';

export type FieldType =
  | 'binary'
  | 'boolean'
  | 'date'
  | 'double'
  | 'float'
  | 'geo_point'
  | 'geo_shape'
  | 'integer'
  | 'ip'
  | 'keyword'
  | 'text'
  | 'long'
  | 'nested'
  | 'object'
  | 'short';

export interface BaseFieldOptions {
  type: FieldType;
  required?: boolean;
}

export interface TextFieldOptions extends BaseFieldOptions {
  type: 'text';
  analyzer?: string;
  searchAnalyzer?: string;
  index?: boolean | 'no' | 'analyzed' | 'not_analyzed' | 'no';
  norms?: boolean;
  indexOptions?: 'docs' | 'freqs' | 'positions' | 'offsets';
  termVector?: 'no' | 'yes' | 'with_positions' | 'with_positions_payloads' | 'with_offsets' | 'with_positions_offsets' | 'with_positions_offsets_payloads';
  boost?: number;
  similarity?: string;
  eagerGlobalOrdinals?: boolean;
  fielddata?: boolean;
  fielddataFrequencyFilter?: {
    min: number;
    max: number;
    minSegmentSize: number;
  };
  maxInputLength?: number;
  ignoreAbove?: number;
  coerce?: boolean;
  copyTo?: string | string[];
  store?: boolean;
  nullValue?: string;
  positionIncrementGap?: number;
  scalingFactor?: number;
  splitQueriesOnWhitespace?: boolean;
}

export interface DateFieldOptions extends BaseFieldOptions {
  type: 'date';
  boost?: number;
  docValues?: boolean;
  format?: string;
  ignoreMalformed?: boolean;
  index?: boolean;
  locale?: string;
  nullValue?: string | null;
  store?: boolean;
}

export interface NestedFieldOptions extends BaseFieldOptions {
  type: 'nested';
  fields?: Record<string, BaseFieldOptions>;
}

export type FieldOptions =
  | TextFieldOptions
  | NestedFieldOptions
  | DateFieldOptions;

export interface IndexOptions {
  name: string;
  clientOptions: ClientOptions;
  createIfNotExists: boolean;
  numberOfShards?: number;
  numberOfReplicas?: number;
}

export interface IndexMetadata {
  clientOptions: ClientOptions;
  name: string;
  properties: {
    [propertyName: string]: {
      type: FieldType;
      required: boolean;
      options: Partial<FieldOptions>;
    };
  };
}

export interface UpdateOptions {
  allowNoIndices?: boolean;
  analyzer?: string;
  analyzeWildcard?: boolean;
  conflicts?: 'abort' | 'proceed';
  defaultOperator?: 'AND' | 'OR';
  df?: string;
  expandWildcards?: 'all' | 'open' | 'closed' | 'hidden' | 'none';
  from?: number;
  ignoreUnavailable?: boolean;
  lenient?: boolean;
  maxDocs?: number;
  pipeline?: string;
  preference?: string;
  q?: string;
  requestCache?: boolean;
  refresh?: boolean;
  requestsPerSecond?: number;
  routing?: string;
  scroll?: string;
  scrollSize?: number;
  searchType?: string;
  searchTimeout?: string;
  slices?: number;
  sort?: string;
  _source?: string;
  _sourceExcludes?: string | string[];
  _sourceIncludes?: string | string[];
  _sourceExclude?: string | string[];
  _sourceInclude?: string | string[];
  stats?: string;
  terminateAfter?: number;
  timeout?: string;
  version?: string;
  waitForActiveShards?: string;
  waitForCompletion?: string;
  script?: {
    source: string;
    lang?: string;
    params?: Record<string, any>;
  };
};

export interface DeleteOptions {
  _sourceExclude?: string | string[];
  _sourceInclude?: string | string[];
  analyzer?: string;
  analyzeWildcard?: boolean;
  defaultOperator?: 'AND' | 'OR';
  df?: string;
  from?: number;
  ignoreUnavailable?: boolean;
  allowNoIndices?: boolean;
  conflicts?: 'abort' | 'proceed';
  expandWildcards?: 'open' | 'closed' | 'hidden' | 'none' | 'all';
  lenient?: boolean;
  preference?: string;
  q?: string;
  routing?: string | string[];
  scroll?: string;
  searchType?: 'query_then_fetch' | 'dfs_query_then_fetch';
  searchTimeout?: string;
  size?: number;
  maxDocs?: number;
  sort?: string | string[];
  _source?: string | string[];
  _sourceExcludes?: string | string[];
  _sourceIncludes?: string | string[];
  terminateAfter?: number;
  stats?: string | string[];
  version?: boolean;
  requestCache?: boolean;
  refresh?: boolean;
  timeout?: string;
  waitForActiveShards?: string;
  scrollSize?: number;
  waitForCompletion?: boolean;
  requestsPerSecond?: number;
  slices?: number | string;
  script?: {
    source: string;
    lang?: string;
    params?: Record<string, any>;
  };
};