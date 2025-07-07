import {
  QueryBuilder,
  BooleanQueryBuilder,
  QueryOptions,
  MatchQueryOptions,
  TermQueryOptions,
  RangeQueryOptions,
  SortOptions,
  SearchResult,
  MetricAggregationOptions,
  BucketAggregationOptions,
  DateHistogramAggregationOptions,
  RangeAggregationOptions,
  FuzzyQueryOptions,
  PrefixQueryOptions,
  GeoDistanceOptions,
  GeoBoundingBoxOptions,
  DateHistogramOptions,
  AggregationBuilder,
  SearchOptions,
} from "./types";
import { Client } from "@opensearch-project/opensearch";

export class BooleanQueryBuilderImpl<T> implements BooleanQueryBuilder<T> {
  private query: any = {
    bool: {
      must: [],
      must_not: [],
      should: [],
      filter: [],
    },
  };

  must(
    field: string,
    value: any,
    options?: QueryOptions
  ): BooleanQueryBuilder<T> {
    this.query.bool.must.push({
      term: {
        [field]: {
          value,
          ...options,
        },
      },
    });
    return this;
  }

  mustNot(
    field: string,
    value: any,
    options?: QueryOptions
  ): BooleanQueryBuilder<T> {
    this.query.bool.must_not.push({
      term: {
        [field]: {
          value,
          ...options,
        },
      },
    });
    return this;
  }

  should(
    field: string,
    value: any,
    options?: QueryOptions
  ): BooleanQueryBuilder<T> {
    if (Array.isArray(value)) {
      this.query.bool.should.push({
        terms: {
          [field]: value,
        },
      });
    } else {
      this.query.bool.should.push({
        term: {
          [field]: {
            value,
            ...options,
          },
        },
      });
    }
    return this;
  }

  filter(
    field: string,
    value: any,
    options?: QueryOptions
  ): BooleanQueryBuilder<T> {
    if (typeof value === "object" && ("gte" in value || "lte" in value)) {
      this.query.bool.filter.push({
        range: {
          [field]: value,
        },
      });
    } else {
      this.query.bool.filter.push({
        term: {
          [field]: value,
        },
      });
    }
    return this;
  }

  getQuery(): any {
    return this.query;
  }
}

export class QueryBuilderImpl<T> implements QueryBuilder<T> {
  private query: any = { query: {} };
  private searchOptions: SearchOptions = {};
  private client: Client;
  private indexName: string;

  constructor(client: Client, indexName: string) {
    this.client = client;
    this.indexName = indexName;
  }

  match(
    field: string,
    value: any,
    options?: MatchQueryOptions
  ): QueryBuilder<T> {
    this.query.query = {
      match: {
        [field]: {
          query: value,
          ...options,
        },
      },
    };
    return this;
  }

  term(field: string, value: any, options?: TermQueryOptions): QueryBuilder<T> {
    this.query.query = {
      term: {
        [field]: {
          value,
          ...options,
        },
      },
    };
    return this;
  }

  range(field: string, options: RangeQueryOptions): QueryBuilder<T> {
    this.query.query = {
      range: {
        [field]: options,
      },
    };
    return this;
  }

  exists(field: string): QueryBuilder<T> {
    this.query.query = {
      exists: { field },
    };
    return this;
  }

  prefix(
    field: string,
    value: string,
    options?: PrefixQueryOptions
  ): QueryBuilder<T> {
    this.query.query = {
      prefix: {
        [field]: {
          value,
          ...options,
        },
      },
    };
    return this;
  }

  wildcard(field: string, value: string): QueryBuilder<T> {
    this.query.query = {
      wildcard: {
        [field]: value,
      },
    };
    return this;
  }

  regexp(field: string, value: string): QueryBuilder<T> {
    this.query.query = {
      regexp: {
        [field]: value,
      },
    };
    return this;
  }

  fuzzy(
    field: string,
    value: string,
    options?: FuzzyQueryOptions
  ): QueryBuilder<T> {
    this.query.query = {
      fuzzy: {
        [field]: {
          value,
          ...options,
        },
      },
    };
    return this;
  }

  bool(fn: (builder: BooleanQueryBuilder<T>) => void): QueryBuilder<T> {
    const boolBuilder = new BooleanQueryBuilderImpl<T>();
    fn(boolBuilder);
    this.query.query = boolBuilder.getQuery();
    return this;
  }

  geoDistance(field: string, options: GeoDistanceOptions): QueryBuilder<T> {
    this.query.query = {
      geo_distance: {
        distance: options.distance,
        [field]: {
          lat: options.lat,
          lon: options.lon,
        },
      },
    };
    return this;
  }

  geoBoundingBox(
    field: string,
    options: GeoBoundingBoxOptions
  ): QueryBuilder<T> {
    this.query.query = {
      geo_bounding_box: {
        [field]: {
          top_left: options.top_left,
          bottom_right: options.bottom_right,
        },
      },
    };
    return this;
  }

  hasParent<P>(
    type: string,
    queryFn: (q: QueryBuilder<P>) => void
  ): QueryBuilder<T> {
    const parentQuery = new QueryBuilderImpl<P>(this.client, this.indexName);
    queryFn(parentQuery);
    this.query.query = {
      has_parent: {
        parent_type: type,
        query: parentQuery.getQuery().query,
      },
    };
    return this;
  }

  hasChild<C>(
    type: string,
    queryFn: (q: QueryBuilder<C>) => void
  ): QueryBuilder<T> {
    const childQuery = new QueryBuilderImpl<C>(this.client, this.indexName);
    queryFn(childQuery);
    this.query.query = {
      has_child: {
        type,
        query: childQuery.getQuery().query,
      },
    };
    return this;
  }

  nested(
    path: string,
    queryFn: (builder: QueryBuilder<T>) => void
  ): QueryBuilder<T> {
    const nestedQuery = new QueryBuilderImpl<T>(this.client, this.indexName);
    queryFn(nestedQuery);
    this.query.query = {
      nested: {
        path,
        query: nestedQuery.getQuery(),
      },
    };
    return this;
  }

  // Search options
  sort(field: string, order?: "asc" | "desc" | SortOptions): QueryBuilder<T> {
    if (!this.searchOptions.sort) {
      this.searchOptions.sort = [];
    }
    if (typeof order === "string") {
      this.searchOptions.sort.push({ [field]: { order } });
    } else {
      this.searchOptions.sort.push({ [field]: order });
    }
    return this;
  }

  from(value: number): QueryBuilder<T> {
    this.searchOptions.from = value;
    return this;
  }

  size(value: number): QueryBuilder<T> {
    this.searchOptions.size = value;
    return this;
  }

  source(
    value: boolean | string[] | { includes?: string[]; excludes?: string[] }
  ): QueryBuilder<T> {
    this.searchOptions._source = value;
    return this;
  }

  timeout(value: string): QueryBuilder<T> {
    this.searchOptions.timeout = value;
    return this;
  }

  trackTotalHits(value: boolean | number): QueryBuilder<T> {
    this.searchOptions.track_total_hits = value;
    return this;
  }

  // Aggregations
  aggs(name: string, aggFn: (a: AggregationBuilder) => void): QueryBuilder<T> {
    const aggBuilder = new AggregationBuilderImpl();
    aggFn(aggBuilder);
    const aggregation = aggBuilder.getAggregation();

    if (!this.query.aggs) {
      this.query.aggs = {};
    }

    // 직전(마지막) 집계가 terms 집계라면, 해당 terms의 aggs에 서브 집계 추가
    const aggNames = Object.keys(this.query.aggs);
    if (aggNames.length > 0) {
      const lastAggName = aggNames[aggNames.length - 1];
      const lastAgg = this.query.aggs[lastAggName];
      if (lastAgg && lastAgg.terms) {
        if (!lastAgg.aggs) lastAgg.aggs = {};
        lastAgg.aggs[name] = aggregation;
        return this;
      }
    }

    // 기존 집계가 있는 경우(기존 로직)
    if (this.query.aggs[name]) {
      if (this.query.aggs[name].terms) {
        if (!this.query.aggs[name].aggs) {
          this.query.aggs[name].aggs = {};
        }
        Object.entries(aggregation).forEach(([key, value]) => {
          this.query.aggs[name].aggs[key] = value;
        });
      } else {
        Object.assign(this.query.aggs[name], aggregation);
      }
    } else {
      this.query.aggs[name] = aggregation;
    }

    return this;
  }

  terms(name: string, options: BucketAggregationOptions): QueryBuilder<T> {
    if (!this.query.aggs) {
      this.query.aggs = {};
    }
    this.query.aggs[name] = {
      terms: {
        field: options.field,
        size: options.size,
      },
      aggs: {},
    };
    return this;
  }

  dateHistogram(
    name: string,
    options: DateHistogramAggregationOptions
  ): QueryBuilder<T> {
    if (!this.query.aggs) {
      this.query.aggs = {};
    }
    this.query.aggs[name] = {
      date_histogram: {
        field: options.field,
        calendar_interval: options.calendar_interval,
      },
    };
    return this;
  }

  rangeAggregation(
    name: string,
    options: RangeAggregationOptions
  ): QueryBuilder<T> {
    if (!this.query.aggs) {
      this.query.aggs = {};
    }
    this.query.aggs[name] = {
      range: {
        field: options.field,
        ranges: options.ranges,
      },
    };
    return this;
  }

  avg(name: string, options: MetricAggregationOptions): QueryBuilder<T> {
    if (!this.query.aggs) {
      this.query.aggs = {};
    }
    this.query.aggs[name] = {
      avg: { field: options.field },
    };
    return this;
  }

  sum(name: string, options: MetricAggregationOptions): QueryBuilder<T> {
    if (!this.query.aggs) {
      this.query.aggs = {};
    }
    this.query.aggs[name] = {
      sum: { field: options.field },
    };
    return this;
  }

  min(name: string, options: MetricAggregationOptions): QueryBuilder<T> {
    if (!this.query.aggs) {
      this.query.aggs = {};
    }
    this.query.aggs[name] = {
      min: { field: options.field },
    };
    return this;
  }

  max(name: string, options: MetricAggregationOptions): QueryBuilder<T> {
    if (!this.query.aggs) {
      this.query.aggs = {};
    }
    this.query.aggs[name] = {
      max: { field: options.field },
    };
    return this;
  }

  count(name: string, options: MetricAggregationOptions): QueryBuilder<T> {
    if (!this.query.aggs) {
      this.query.aggs = {};
    }
    this.query.aggs[name] = {
      value_count: { field: options.field },
    };
    return this;
  }

  // Execution
  async execute(): Promise<SearchResult<T>> {
    const searchBody = {
      ...this.query,
      ...this.searchOptions,
    };

    if (!searchBody.query || Object.keys(searchBody.query).length === 0) {
      searchBody.query = { match_all: {} };
    }

    const response = await this.client.search({
      index: this.indexName,
      body: searchBody,
    });

    return {
      hits: {
        total: {
          value: response.body.hits.total.value,
          relation: response.body.hits.total.relation,
        },
        max_score: response.body.hits.max_score,
        hits: response.body.hits.hits.map((hit: any) => ({
          _index: hit._index,
          _id: hit._id,
          _score: hit._score,
          _source: hit._source,
        })),
      },
      took: response.body.took,
      timed_out: response.body.timed_out,
      aggregations: response.body.aggregations,
    };
  }

  getQuery(): any {
    return this.query;
  }
}

export class AggregationBuilderImpl implements AggregationBuilder {
  private aggregation: any = {};

  dateHistogram(
    field: string,
    options: DateHistogramOptions
  ): AggregationBuilder {
    this.aggregation = {
      ...this.aggregation,
      date_histogram: {
        field,
        ...options,
      },
    };
    return this;
  }

  sum(field: string): AggregationBuilder {
    this.aggregation = {
      ...this.aggregation,
      sum: { field },
    };
    return this;
  }

  avg(field: string): AggregationBuilder {
    this.aggregation = {
      ...this.aggregation,
      avg: { field },
    };
    return this;
  }

  min(field: string): AggregationBuilder {
    this.aggregation = {
      ...this.aggregation,
      min: { field },
    };
    return this;
  }

  max(field: string): AggregationBuilder {
    this.aggregation = {
      ...this.aggregation,
      max: { field },
    };
    return this;
  }

  extendedStats(field: string): AggregationBuilder {
    this.aggregation = {
      ...this.aggregation,
      extended_stats: { field },
    };
    return this;
  }

  matrixStats(): AggregationBuilder {
    this.aggregation = {
      ...this.aggregation,
      matrix_stats: { fields: [] },
    };
    return this;
  }

  fields(fields: string[]): AggregationBuilder {
    if (this.aggregation.matrix_stats) {
      this.aggregation.matrix_stats.fields = fields;
    }
    return this;
  }

  subAggs(
    name: string,
    aggFn: (a: AggregationBuilder) => void
  ): AggregationBuilder {
    const subAggBuilder = new AggregationBuilderImpl();
    aggFn(subAggBuilder);

    this.aggregation = {
      ...this.aggregation,
      aggs: {
        ...this.aggregation.aggs,
        [name]: subAggBuilder.getAggregation(),
      },
    };
    return this;
  }

  getAggregation(): any {
    return this.aggregation;
  }
}
