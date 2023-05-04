import { ClientOptions } from '@opensearch-project/opensearch';

export type FieldType =
  | 'binary'
  | 'boolean'
  | 'date'
  | 'double'
  | 'float'
  | 'integer_range'
  | 'long_range'
  | 'double_range'
  | 'float_range'
  | 'ip_range'
  | 'date_range'
  | 'geo_point'
  | 'geo_shape'
  | 'integer'
  | 'ip'
  | 'completion'
  | 'search_as_you_type'
  | 'keyword'
  | 'text'
  | 'long'
  | 'nested'
  | 'object'
  | 'join'
  | 'short'
  | 'alias'
  | 'xy_point'
  | 'rank_feature'
  | 'rank_features'
  | 'percolator';

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

export interface KeywordFieldOptions extends BaseFieldOptions {
  type: 'keyword';
  boost?: number;
  docValues?: boolean;
  eagerGlobalOrdinals?: boolean;
  fields?: string | string[];
  ignoreAbove?: number;
  index?: boolean | 'no' | 'analyzed' | 'not_analyzed' | 'no';
  indexOptions?: 'docs' | 'freqs';
  normalizer?: string;
  norms?: boolean;
  nullValue?: string;
  similarity?: string;
  splitQueriesOnWhitespace?: boolean;
  store?: boolean;
}

export interface DateFieldOptions extends BaseFieldOptions {
  type: 'date';
  boost?: number;
  docValues?: boolean;
  format?: string;
  ignoreMalformed?: boolean;
  index?: boolean | 'no' | 'analyzed' | 'not_analyzed' | 'no';
  locale?: string;
  nullValue?: string;
  store?: boolean;
}

export interface ObjectFieldOptions extends BaseFieldOptions {
  type: 'object';
  dynamic?: boolean | 'strict';
  enabled?: boolean;
}

export interface NestedFieldOptions extends BaseFieldOptions {
  type: 'nested';
  dynamic?: boolean | 'strict';
  includeInParent?: boolean;
  includeInRoot?: boolean;
  properties: Record<string, BaseFieldOptions>;
}

export interface IPFieldOptions extends BaseFieldOptions {
  type: 'ip';
  boost?: number;
  docValues?: boolean;
  ignoreMalformed?: boolean;
  index?: boolean | 'no' | 'analyzed' | 'not_analyzed' | 'no';
  nullValue?: string;
  store?: boolean;
}

export interface NumberRangeFieldOptions extends BaseFieldOptions {
  type: 'integer_range' | 'long_range' | 'double_range' | 'float_range';
  format?: string;
  gte?: string;
  lte?: string;
  relation?: 'intersects' | 'contains' | 'within';
  boost?: number;
  coerce?: boolean;
  index?: boolean | 'no' | 'analyzed' | 'not_analyzed' | 'no';
  store?: boolean;
}

export interface IPRangeFieldOptions extends BaseFieldOptions {
  type: 'ip_range';
  boost?: number;
  coerce?: boolean;
  index?: boolean | 'no' | 'analyzed' | 'not_analyzed' | 'no';
  store?: boolean;
  gte?: string;
  lte?: string;
}

export interface DateRangeFieldOptions extends BaseFieldOptions {
  type: 'date_range';
  boost?: number;
  coerce?: boolean;
  index?: boolean | 'no' | 'analyzed' | 'not_analyzed' | 'no';
  store?: boolean;
  gte?: string;
  lte?: string;
}

export interface BooleanFieldOptions extends BaseFieldOptions {
  type: 'boolean';
  boost?: number;
  docValues?: boolean;
  index?: boolean | 'no' | 'analyzed' | 'not_analyzed' | 'no';
  store?: boolean;
  nullValue?: boolean;
}

export interface NumberFieldOptions {
  type: 'byte' | 'double' | 'float' | 'half_float' | 'integer' | 'long' | 'short' | 'scaled_float';
  boost?: number;
  coerce?: boolean;
  index?: boolean | 'no' | 'analyzed' | 'not_analyzed' | 'no';
  store?: boolean;
  docValues?: boolean;
  ignoreMalformed?: boolean;
  nullValue?: number;
}

export interface ScaledFloatFieldOptions extends NumberFieldOptions {
  type: 'scaled_float';
  scaling_factor?: number;
}

export interface BinaryFieldOptions extends BaseFieldOptions {
  type: 'binary';
  store?: boolean;
  docValues?: boolean;
}

export interface CompletionFieldOptions extends BaseFieldOptions {
  type: 'completion';
  input?: string[];
  weight?: number;
}

export interface SearchAsYouTypeFieldOptions extends BaseFieldOptions {
  type: 'search_as_you_type';
  analyzer?: string;
  searchAnalyzer?: string;
  searchQuoteAnalyzer?: string;
  store?: boolean;
  similarity?: string;
  norms?: boolean;
  maxShingleSize?: number;
  indexOptions?: 'docs' | 'freqs' | 'positions' | 'offsets';
  index?: boolean | 'no' | 'analyzed' | 'not_analyzed' | 'no';
  termVector?: 'no' | 'yes' | 'with_positions' | 'with_positions_payloads' | 'with_offsets' | 'with_positions_offsets' | 'with_positions_offsets_payloads';
}

export interface AliasFieldOptions extends BaseFieldOptions {
  type: 'alias';
  path: string;
}

export interface GeoPointFieldOptions extends BaseFieldOptions {
  type: 'geo_point';
  ignoreMalformed?: boolean;
  ignoreZValue?: boolean;
  nullValue?: string | { lat: number; lon: number };
  store?: boolean;
  docValues?: boolean;
}

export interface XYPointFieldOptions extends BaseFieldOptions {
  type: 'xy_point';
  ignoreMalformed?: boolean;
  ignoreZValue?: boolean;
  nullValue?: string;
}

export interface RankFeatureFieldOptions extends BaseFieldOptions {
  type: 'rank_feature';
  positiveScoreImpact?: boolean;
}

export type FieldOptions =
  | TextFieldOptions
  | KeywordFieldOptions
  | BinaryFieldOptions
  | NumberFieldOptions
  | NumberRangeFieldOptions
  | IPRangeFieldOptions
  | DateRangeFieldOptions
  | NestedFieldOptions
  | ObjectFieldOptions
  | BooleanFieldOptions
  | DateFieldOptions
  | SearchAsYouTypeFieldOptions
  | CompletionFieldOptions
  | AliasFieldOptions
  | GeoPointFieldOptions
  | XYPointFieldOptions
  | RankFeatureFieldOptions;

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