import { ClientOptions } from "@opensearch-project/opensearch";

export type FieldType =
  | "text"
  | "keyword"
  | "long"
  | "integer"
  | "short"
  | "byte"
  | "double"
  | "float"
  | "half_float"
  | "scaled_float"
  | "date"
  | "boolean"
  | "binary"
  | "object"
  | "nested"
  | "geo_point"
  | "geo_shape"
  | "ip"
  | "integer_range"
  | "long_range"
  | "double_range"
  | "float_range"
  | "ip_range"
  | "date_range"
  | "completion"
  | "search_as_you_type"
  | "alias"
  | "xy_point"
  | "rank_feature"
  | "join";

export interface BaseFieldOptions {
  type: FieldType;
  required?: boolean;
  default?: any;
  fields?: {
    [fieldName: string]: FieldOptions;
  };
}

export interface TextFieldOptions extends BaseFieldOptions {
  type: "text";
  default?: string;
  analyzer?: string;
  searchAnalyzer?: string;
  index?: boolean | "no" | "analyzed" | "not_analyzed" | "no";
  norms?: boolean;
  indexOptions?: "docs" | "freqs" | "positions" | "offsets";
  termVector?:
    | "no"
    | "yes"
    | "with_positions"
    | "with_positions_payloads"
    | "with_offsets"
    | "with_positions_offsets"
    | "with_positions_offsets_payloads";
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
  type: "keyword";
  default?: string;
  boost?: number;
  docValues?: boolean;
  eagerGlobalOrdinals?: boolean;
  ignoreAbove?: number;
  index?: boolean | "no" | "analyzed" | "not_analyzed" | "no";
  indexOptions?: "docs" | "freqs";
  normalizer?: string;
  norms?: boolean;
  nullValue?: string;
  similarity?: string;
  splitQueriesOnWhitespace?: boolean;
  store?: boolean;
}

export interface DateFieldOptions extends BaseFieldOptions {
  type: "date";
  default?: string | Date;
  boost?: number;
  docValues?: boolean;
  format?: string;
  ignoreMalformed?: boolean;
  index?: boolean | "no" | "analyzed" | "not_analyzed" | "no";
  locale?: string;
  nullValue?: string;
  store?: boolean;
}

export interface ObjectFieldOptions extends BaseFieldOptions {
  type: "object";
  default?: object;
  dynamic?: boolean | "strict";
  enabled?: boolean;
  properties: Record<string, FieldOptions>;
}

export interface NestedFieldOptions extends BaseFieldOptions {
  type: "nested";
  default?: object;
  dynamic?: boolean | "strict";
  includeInParent?: boolean;
  includeInRoot?: boolean;
  properties: Record<string, FieldOptions>;
}

export interface IPFieldOptions extends BaseFieldOptions {
  type: "ip";
  boost?: number;
  docValues?: boolean;
  ignoreMalformed?: boolean;
  index?: boolean | "no" | "analyzed" | "not_analyzed" | "no";
  nullValue?: string;
  store?: boolean;
}

export interface NumberRangeFieldOptions extends BaseFieldOptions {
  type: "integer_range" | "long_range" | "double_range" | "float_range";
  default?: number;
  format?: string;
  gte?: string;
  lte?: string;
  relation?: "intersects" | "contains" | "within";
  boost?: number;
  coerce?: boolean;
  index?: boolean | "no" | "analyzed" | "not_analyzed" | "no";
  store?: boolean;
}

export interface IPRangeFieldOptions extends BaseFieldOptions {
  type: "ip_range";
  default?: string;
  boost?: number;
  coerce?: boolean;
  index?: boolean | "no" | "analyzed" | "not_analyzed" | "no";
  store?: boolean;
  gte?: string;
  lte?: string;
}

export interface DateRangeFieldOptions extends BaseFieldOptions {
  type: "date_range";
  default?: string | Date;
  boost?: number;
  coerce?: boolean;
  index?: boolean | "no" | "analyzed" | "not_analyzed" | "no";
  store?: boolean;
  gte?: string;
  lte?: string;
}

export interface BooleanFieldOptions extends BaseFieldOptions {
  type: "boolean";
  default?: boolean;
  boost?: number;
  docValues?: boolean;
  index?: boolean | "no" | "analyzed" | "not_analyzed" | "no";
  store?: boolean;
  nullValue?: boolean;
}

export interface NumberFieldOptions extends BaseFieldOptions {
  type:
    | "byte"
    | "double"
    | "float"
    | "half_float"
    | "integer"
    | "long"
    | "short"
    | "scaled_float";
  default?: number;
  boost?: number;
  coerce?: boolean;
  index?: boolean | "no" | "analyzed" | "not_analyzed" | "no";
  store?: boolean;
  docValues?: boolean;
  ignoreMalformed?: boolean;
  nullValue?: number;
}

export interface ScaledFloatFieldOptions extends NumberFieldOptions {
  type: "scaled_float";
  scaling_factor?: number;
}

export interface BinaryFieldOptions extends BaseFieldOptions {
  type: "binary";
  default?: boolean;
  store?: boolean;
  docValues?: boolean;
}

export interface CompletionFieldOptions extends BaseFieldOptions {
  type: "completion";
  input?: string[];
  weight?: number;
}

export interface SearchAsYouTypeFieldOptions extends BaseFieldOptions {
  type: "search_as_you_type";
  analyzer?: string;
  searchAnalyzer?: string;
  searchQuoteAnalyzer?: string;
  store?: boolean;
  similarity?: string;
  norms?: boolean;
  maxShingleSize?: number;
  indexOptions?: "docs" | "freqs" | "positions" | "offsets";
  index?: boolean | "no" | "analyzed" | "not_analyzed" | "no";
  termVector?:
    | "no"
    | "yes"
    | "with_positions"
    | "with_positions_payloads"
    | "with_offsets"
    | "with_positions_offsets"
    | "with_positions_offsets_payloads";
}

export interface AliasFieldOptions extends BaseFieldOptions {
  type: "alias";
  path: string;
}

export interface GeoPointFieldOptions extends BaseFieldOptions {
  type: "geo_point";
  ignoreMalformed?: boolean;
  ignoreZValue?: boolean;
  nullValue?: string | { lat: number; lon: number };
  store?: boolean;
  docValues?: boolean;
}

export interface XYPointFieldOptions extends BaseFieldOptions {
  type: "xy_point";
  ignoreMalformed?: boolean;
  ignoreZValue?: boolean;
  nullValue?: string;
}

export interface RankFeatureFieldOptions extends BaseFieldOptions {
  type: "rank_feature";
  positiveScoreImpact?: boolean;
}

export interface JoinFieldOptions extends BaseFieldOptions {
  type: "join";
  relations?: Record<string, string | string[]>;
  eager_global_ordinals?: boolean;
}

export interface FieldOptions {
  type: FieldType;
  required?: boolean;
  default?: any;
  options?: Partial<FieldOptions>;
  fields?: { [fieldName: string]: FieldOptions };
  properties?: { [propertyName: string]: FieldOptions };
  validate?: (value: any) => boolean;
  boost?: number;
  relations?: Record<string, string | string[]>;
  analyzer?: string;
  searchAnalyzer?: string;
  normalizer?: string;
  __meta?: {
    required?: boolean;
    default?: any;
    validate?: (value: any) => boolean;
  };
}

export interface IndexOptions {
  name?: string;
  numberOfShards?: number;
  numberOfReplicas?: number;
  settings?: Record<string, any>;
  dynamic?: "strict" | "true" | "false" | boolean;
}

export interface IndexMetadata {
  name?: string;
  numberOfShards?: number;
  numberOfReplicas?: number;
  properties: {
    [propertyName: string]: FieldOptions;
  };
}

export interface UpdateOptions {
  allowNoIndices?: boolean;
  analyzer?: string;
  analyzeWildcard?: boolean;
  conflicts?: "abort" | "proceed";
  defaultOperator?: "AND" | "OR";
  df?: string;
  expandWildcards?: "all" | "open" | "closed" | "hidden" | "none";
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
}

export interface DeleteOptions {
  _sourceExclude?: string | string[];
  _sourceInclude?: string | string[];
  analyzer?: string;
  analyzeWildcard?: boolean;
  defaultOperator?: "AND" | "OR";
  df?: string;
  from?: number;
  ignoreUnavailable?: boolean;
  allowNoIndices?: boolean;
  conflicts?: "abort" | "proceed";
  expandWildcards?: "open" | "closed" | "hidden" | "none" | "all";
  lenient?: boolean;
  preference?: string;
  q?: string;
  routing?: string | string[];
  scroll?: string;
  searchType?: "query_then_fetch" | "dfs_query_then_fetch";
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
}

export interface BulkOperationError {
  type: string;
  reason: string;
  index: string;
  id: string;
  status: number;
}

export interface BulkResponse {
  took: number;
  errors: boolean;
  items: Array<{
    index?: {
      _index: string;
      _id: string;
      _version?: number;
      result?: string;
      status: number;
      error?: BulkOperationError;
    };
    delete?: {
      _index: string;
      _id: string;
      _version?: number;
      result?: string;
      status: number;
      error?: BulkOperationError;
    };
  }>;
}

export interface BulkOptions {
  refresh?: boolean;
  timeout?: string;
  waitForActiveShards?: number | "all";
}

export interface MigrationOptions {
  dryRun?: boolean;
  backup?: boolean;
  reindex?: boolean;
  deleteFields?: boolean;
  timeout?: string;
  waitForCompletion?: boolean;
}

export interface MigrationPlan {
  indexName: string;
  addedFields: string[];
  modifiedFields: string[];
  deletedFields: string[];
  requiresReindex: boolean;
  estimatedDuration: string;
  details: {
    [field: string]: {
      type: "added" | "modified" | "deleted";
      oldType?: string;
      newType?: string;
      oldOptions?: Partial<FieldOptions>;
      newOptions?: Partial<FieldOptions>;
    };
  };
}

export interface MigrationResult {
  success: boolean;
  duration: number;
  migrationId: string;
  timestamp: Date;
  plan: MigrationPlan;
  errors?: any[];
  error?: string;
  backupIndex?: string;
}

export interface MigrationHistory extends MigrationResult {
  backupIndex?: string;
  rolledBack?: {
    timestamp: Date;
    success: boolean;
    errors?: any[];
  };
}

export interface MigrationMetadata {
  version: number;
  lastMigrationId?: string;
  history: MigrationHistory[];
}

export interface QueryOptions {
  boost?: number;
  _name?: string;
}

export interface MatchQueryOptions extends QueryOptions {
  operator?: "OR" | "AND";
  minimum_should_match?: number | string;
  fuzziness?: number | "AUTO";
  prefix_length?: number;
  max_expansions?: number;
  fuzzy_transpositions?: boolean;
  lenient?: boolean;
  zero_terms_query?: "none" | "all";
  analyzer?: string;
}

export interface TermQueryOptions extends QueryOptions {
  case_insensitive?: boolean;
}

export interface RangeQueryOptions extends QueryOptions {
  gt?: number | string | Date;
  gte?: number | string | Date;
  lt?: number | string | Date;
  lte?: number | string | Date;
  format?: string;
  relation?: "INTERSECTS" | "CONTAINS" | "WITHIN";
  time_zone?: string;
}

export interface BoolQueryOptions extends QueryOptions {
  minimum_should_match?: number | string;
}

export interface SortOptions {
  order?: "asc" | "desc";
  mode?: "min" | "max" | "sum" | "avg" | "median";
  missing?: "_last" | "_first" | any;
}

export interface SearchOptions {
  from?: number;
  size?: number;
  sort?: Array<Record<string, SortOptions>>;
  _source?: boolean | string[] | { includes?: string[]; excludes?: string[] };
  track_total_hits?: boolean | number;
  timeout?: string;
  terminate_after?: number;
  aggs?: Record<string, any>;
}

export interface SearchResult<T> {
  hits: {
    total: {
      value: number;
      relation: "eq" | "gte";
    };
    max_score: number | null;
    hits: Array<{
      _index: string;
      _id: string;
      _score: number;
      _source: T;
    }>;
  };
  took: number;
  timed_out: boolean;
  aggregations?: Record<string, any>;
}

export interface AggregationResult {
  value?: number;
  doc_count?: number;
  buckets?: Array<{
    key: string | number;
    doc_count: number;
    [key: string]: any;
  }>;
  [key: string]: any;
}

export interface MetricAggregationOptions {
  field: string;
  script?: {
    source: string;
    lang?: string;
    params?: Record<string, any>;
  };
  missing?: any;
}

export interface BucketAggregationOptions {
  field: string;
  size?: number;
  order?: {
    [key: string]: "asc" | "desc";
  };
  min_doc_count?: number;
  include?: string | string[];
  exclude?: string | string[];
  missing?: any;
}

export interface DateHistogramAggregationOptions
  extends BucketAggregationOptions {
  calendar_interval?:
    | "minute"
    | "hour"
    | "day"
    | "week"
    | "month"
    | "quarter"
    | "year";
  fixed_interval?: string;
  format?: string;
  time_zone?: string;
  offset?: string;
  keyed?: boolean;
}

export interface RangeAggregationOptions extends BucketAggregationOptions {
  ranges: Array<{
    from?: number;
    to?: number;
    key?: string;
  }>;
  keyed?: boolean;
}

export interface NestedQueryOptions {
  score_mode?: "avg" | "sum" | "min" | "max" | "none";
  ignore_unmapped?: boolean;
  boost?: number;
}

export interface ExistsQueryOptions extends QueryOptions {
  boost?: number;
}

export interface WildcardQueryOptions extends QueryOptions {
  case_insensitive?: boolean;
  rewrite?: string;
}

export interface FuzzyQueryOptions extends QueryOptions {
  fuzziness?: number | "AUTO";
  max_expansions?: number;
  prefix_length?: number;
  transpositions?: boolean;
  rewrite?: string;
}

export interface PrefixQueryOptions extends QueryOptions {
  case_insensitive?: boolean;
  rewrite?: string;
}

export interface CacheOptions {
  enabled?: boolean;
  ttl?: number; // Time to live in milliseconds
  key?: string; // Custom cache key
}

export interface QueryBuilder<T> {
  // Basic queries
  match(
    field: string,
    value: any,
    options?: MatchQueryOptions
  ): QueryBuilder<T>;
  term(field: string, value: any, options?: TermQueryOptions): QueryBuilder<T>;
  range(field: string, options: RangeQueryOptions): QueryBuilder<T>;
  exists(field: string): QueryBuilder<T>;
  prefix(
    field: string,
    value: string,
    options?: PrefixQueryOptions
  ): QueryBuilder<T>;
  wildcard(field: string, value: string): QueryBuilder<T>;
  regexp(field: string, value: string): QueryBuilder<T>;
  fuzzy(
    field: string,
    value: string,
    options?: FuzzyQueryOptions
  ): QueryBuilder<T>;

  // Boolean queries
  bool(fn: (builder: BooleanQueryBuilder<T>) => void): QueryBuilder<T>;

  // Geo queries
  geoDistance(field: string, options: GeoDistanceOptions): QueryBuilder<T>;
  geoBoundingBox(
    field: string,
    options: GeoBoundingBoxOptions
  ): QueryBuilder<T>;

  // Join queries
  hasParent<P>(
    type: string,
    queryFn: (q: QueryBuilder<P>) => void
  ): QueryBuilder<T>;
  hasChild<C>(
    type: string,
    queryFn: (q: QueryBuilder<C>) => void
  ): QueryBuilder<T>;
  nested(
    path: string,
    queryFn: (builder: QueryBuilder<T>) => void
  ): QueryBuilder<T>;

  // Aggregations
  aggs(name: string, aggFn: (a: AggregationBuilder) => void): QueryBuilder<T>;
  avg(name: string, options: MetricAggregationOptions): QueryBuilder<T>;
  sum(name: string, options: MetricAggregationOptions): QueryBuilder<T>;
  min(name: string, options: MetricAggregationOptions): QueryBuilder<T>;
  max(name: string, options: MetricAggregationOptions): QueryBuilder<T>;
  count(name: string, options: MetricAggregationOptions): QueryBuilder<T>;
  terms(name: string, options: BucketAggregationOptions): QueryBuilder<T>;
  dateHistogram(
    name: string,
    options: DateHistogramAggregationOptions
  ): QueryBuilder<T>;
  rangeAggregation(
    name: string,
    options: RangeAggregationOptions
  ): QueryBuilder<T>;

  // Search options
  sort(field: string, order?: "asc" | "desc" | SortOptions): QueryBuilder<T>;
  from(value: number): QueryBuilder<T>;
  size(value: number): QueryBuilder<T>;
  source(
    value: boolean | string[] | { includes?: string[]; excludes?: string[] }
  ): QueryBuilder<T>;
  timeout(value: string): QueryBuilder<T>;
  trackTotalHits(value: boolean | number): QueryBuilder<T>;

  // Execution
  execute(): Promise<SearchResult<T>>;
  getQuery(): any;
}

export interface BooleanQueryBuilder<T> {
  must(
    field: string,
    value: any,
    options?: QueryOptions
  ): BooleanQueryBuilder<T>;
  mustNot(
    field: string,
    value: any,
    options?: QueryOptions
  ): BooleanQueryBuilder<T>;
  should(
    field: string,
    value: any,
    options?: QueryOptions
  ): BooleanQueryBuilder<T>;
  filter(
    field: string,
    value: any,
    options?: QueryOptions
  ): BooleanQueryBuilder<T>;
  getQuery(): any;
}

export interface AggregationBuilder {
  dateHistogram(
    field: string,
    options: DateHistogramOptions
  ): AggregationBuilder;
  sum(field: string): AggregationBuilder;
  avg(field: string): AggregationBuilder;
  max(field: string): AggregationBuilder;
  extendedStats(field: string): AggregationBuilder;
  matrixStats(): AggregationBuilder;
  fields(fields: string[]): AggregationBuilder;
  subAggs(
    name: string,
    aggFn: (a: AggregationBuilder) => void
  ): AggregationBuilder;
  getAggregation(): any;
}

export interface DateHistogramOptions {
  calendar_interval?:
    | "minute"
    | "hour"
    | "day"
    | "week"
    | "month"
    | "quarter"
    | "year";
  fixed_interval?: string;
  format?: string;
  time_zone?: string;
  min_doc_count?: number;
}

// Geo queries
export interface GeoDistanceOptions {
  distance: string;
  lat: number;
  lon: number;
}

export interface GeoBoundingBoxOptions {
  top_left: {
    lat: number;
    lon: number;
  };
  bottom_right: {
    lat: number;
    lon: number;
  };
}

// Aggregations
export interface AggregationOptions {
  field: string;
  [key: string]: any;
}
