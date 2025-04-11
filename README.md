# TypenSearch

TypenSearch is a simple and powerful Object Document Mapper (ODM) for OpenSearch, designed to help developers easily interact with OpenSearch indices using TypeScript. Inspired by Typegoose, it brings the power of TypeScript decorators to OpenSearch, making it more intuitive and type-safe.

## Features

- 🎯 Intuitive schema definition with TypeScript decorators
- 🚀 Automatic index management and mapping
- ⚡ Type-safe CRUD operations
- 🛠 Custom field options support
- 📝 Automatic timestamps (createdAt, updatedAt)
- 🔍 Powerful search capabilities

## Installation

```bash
npm install --save typensearch
```

## Quick Start

### 1. OpenSearch Connection Setup

```typescript
import { initialize } from "typensearch";

await initialize(
  {
    node: "http://localhost:9200",
    // Additional OpenSearch client options
    auth: {
      username: "admin",
      password: "admin",
    },
    ssl: {
      rejectUnauthorized: false,
    },
  },
  {
    createIndexesIfNotExists: [User.prototype],
    // Additional TypenSearch options
    debug: true,
  }
);
```

### 2. Model Definition

```typescript
import {
  OpenSearchIndex,
  Field,
  CreatedAt,
  UpdatedAt,
  Model,
} from "typensearch";

@OpenSearchIndex({
  name: "users", // Index name (optional, defaults to lowercase class name)
  numberOfShards: 2,
  numberOfReplicas: 1,
  settings: {
    // Additional index settings
    "index.mapping.total_fields.limit": 2000,
  },
})
class User extends Model {
  @Field({
    type: "text",
    required: true,
    fields: {
      keyword: { type: "keyword" }, // Multi-fields configuration
    },
  })
  username: string;

  @Field({
    type: "keyword",
    required: true,
    validate: (value: string) => {
      return /^[^@]+@[^@]+\.[^@]+$/.test(value);
    },
  })
  email: string;

  @Field({
    type: "object",
    properties: {
      street: { type: "text" },
      city: { type: "keyword" },
      country: { type: "keyword" },
    },
  })
  address?: {
    street: string;
    city: string;
    country: string;
  };

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}
```

### 3. CRUD Operations

```typescript
// Create a document
const user = await User.index({
  username: "john_doe",
  email: "john.doe@example.com",
  address: {
    street: "123 Main St",
    city: "New York",
    country: "USA",
  },
});

// Create/Update multiple documents using bulk operation
const bulkResponse = await User.bulkIndex(
  [
    {
      username: "john_doe",
      email: "john.doe@example.com",
      address: {
        street: "123 Main St",
        city: "New York",
        country: "USA",
      },
    },
    {
      _id: "existing_user", // Update if ID exists
      username: "jane_doe",
      email: "jane.doe@example.com",
    },
  ],
  { refresh: true }
);

// Delete multiple documents using bulk operation
await User.bulkDelete(["user1", "user2", "user3"], { refresh: true });

// Get document by ID
const foundUser = await User.get("user_id");

// Update document
foundUser.username = "jane_doe";
await foundUser.save();

// Update multiple documents
await User.updateMany(
  { city: "New York" }, // search condition
  { country: "US" } // fields to update
);

// Search (using query builder)
const users = await User.query<User>()
  .match("username", "john", { operator: "AND" })
  .bool((q) =>
    q
      .must("address.city", "New York")
      .should("tags", ["developer", "typescript"])
      .filter("createdAt", { gte: "now-7d" })
  )
  .sort("createdAt", "desc")
  .from(0)
  .size(10)
  .execute();

// Delete document
await foundUser.delete();

// Delete multiple documents
await User.deleteMany({
  "address.country": "USA",
});

// Count documents
const count = await User.count({
  query: {
    term: { "address.city": "New York" },
  },
});
```

### 4. Schema Migration

TypenSearch provides powerful schema migration capabilities to help you manage changes to your index mappings safely and efficiently.

```typescript
// Basic Migration Example
@OpenSearchIndex({
  name: "users",
  settings: {
    "index.mapping.total_fields.limit": 2000,
  },
})
class User extends Model {
  @Field({ type: "keyword" })
  name: string;

  @Field({ type: "integer" })
  age: number;
}

// Adding new fields
@OpenSearchIndex({
  name: "users",
  settings: {
    "index.mapping.total_fields.limit": 2000,
  },
})
class UpdatedUser extends Model {
  @Field({ type: "keyword" })
  name: string;

  @Field({ type: "integer" })
  age: number;

  @Field({ type: "text" })
  description: string;

  @Field({ type: "date" })
  createdAt: Date;
}

// Check migration plan
const plan = await UpdatedUser.planMigration();
console.log("Migration Plan:", {
  addedFields: plan.addedFields,
  modifiedFields: plan.modifiedFields,
  deletedFields: plan.deletedFields,
  requiresReindex: plan.requiresReindex,
  estimatedDuration: plan.estimatedDuration,
});

// Execute migration
const result = await UpdatedUser.migrate();

// Safe Migration with Backup and Rollback
const result = await UpdatedUser.migrate({
  backup: true,
  waitForCompletion: true,
});

if (!result.success) {
  const rollback = await UpdatedUser.rollback(result.migrationId);
}

// Large Dataset Migration
const result = await UpdatedUser.migrate({
  backup: true,
  waitForCompletion: false,
  timeout: "1h",
});

// Check Migration History
const history = await UpdatedUser.getMigrationHistory();
```

#### Migration Options

```typescript
interface MigrationOptions {
  dryRun?: boolean; // Test migration without applying changes
  backup?: boolean; // Create backup before migration
  waitForCompletion?: boolean; // Wait for migration to complete
  timeout?: string; // Migration timeout
  batchSize?: number; // Number of documents to process in each batch
}
```

## API Reference

### Decorators

#### @OpenSearchIndex(options: IndexOptions)

Defines index settings.

```typescript
interface IndexOptions {
  name?: string; // Index name
  numberOfShards?: number; // Number of shards
  numberOfReplicas?: number; // Number of replicas
  settings?: Record<string, unknown>; // Additional index settings
}
```

#### @Field(options: FieldOptions)

Defines field type and properties.

```typescript
interface FieldOptions<T> {
  type: string;
  required?: boolean;
  default?: T;
  boost?: number;
  fields?: Record<string, unknown>;
  properties?: Record<string, FieldOptions<unknown>>;
  validate?: (value: T) => boolean;
}
```

### Model Methods

All methods return Promises.

#### Static Methods

- `Model.index<T>(doc: Partial<T>, refresh?: boolean)`: Create a new document
- `Model.get<T>(id: string)`: Get document by ID
- `Model.updateMany<T>(query: any, updates: Partial<T>, options?: UpdateOptions)`: Update multiple documents
- `Model.deleteMany(query: any)`: Delete multiple documents
- `Model.search(body: any, size?: number)`: Search documents with raw query
- `Model.count(body: any)`: Count documents
- `Model.bulkIndex<T>(docs: Partial<T>[], options?: BulkOptions)`: Create or update multiple documents in one operation
- `Model.bulkDelete(ids: string[], options?: BulkOptions)`: Delete multiple documents by their IDs
- `Model.planMigration()`: Generate schema change plan
- `Model.migrate(options?: MigrationOptions)`: Execute schema changes
- `Model.rollback(migrationId: string)`: Rollback a migration
- `Model.getMigrationHistory()`: Get migration history
- `Model.getMapping()`: Get current index mapping with all field options
- `Model.query<T>()`: Get a new query builder instance

#### Instance Methods

- `save(refresh?: boolean)`: Save current document
- `delete(refresh?: boolean)`: Delete current document
- `validate()`: Validate document against schema rules

### Query Builder

Provides a type-safe query builder for writing OpenSearch queries.

#### Basic Queries

```typescript
// Match query
const results = await User.query<User>()
  .match("username", "john", {
    operator: "AND",
    fuzziness: "AUTO",
  })
  .execute();

// Term query
const results = await User.query<User>()
  .term("age", 25, {
    boost: 2.0,
  })
  .execute();

// Range query
const results = await User.query<User>()
  .range("age", {
    gte: 20,
    lte: 30,
  })
  .execute();
```

#### Boolean Queries

```typescript
const results = await User.query<User>()
  .bool((q) =>
    q
      .must("role", "admin")
      .mustNot("status", "inactive")
      .should("tags", ["developer", "typescript"])
      .filter("age", { gte: 20, lte: 30 })
  )
  .execute();
```

#### Search Options

```typescript
const results = await User.query<User>()
  .match("username", "john")
  // Sorting
  .sort("createdAt", "desc")
  .sort("username", { order: "asc", missing: "_last" })
  // Pagination
  .from(0)
  .size(10)
  // Field filtering
  .source({
    includes: ["username", "email", "age"],
    excludes: ["password"],
  })
  // Additional options
  .timeout("5s")
  .trackTotalHits(true)
  .execute();
```

#### Query Options

##### MatchQueryOptions

```typescript
{
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
```

##### TermQueryOptions

```typescript
{
  boost?: number;
  case_insensitive?: boolean;
}
```

##### RangeQueryOptions

```typescript
{
  gt?: number | string | Date;
  gte?: number | string | Date;
  lt?: number | string | Date;
  lte?: number | string | Date;
  format?: string;
  relation?: "INTERSECTS" | "CONTAINS" | "WITHIN";
  time_zone?: string;
}
```

##### SortOptions

```typescript
{
  order?: "asc" | "desc";
  mode?: "min" | "max" | "sum" | "avg" | "median";
  missing?: "_last" | "_first" | any;
}
```

#### Geo Queries

```typescript
// Geo Distance Query
const results = await User.query<User>()
  .geoDistance("location", {
    distance: "200km",
    point: {
      lat: 40.73,
      lon: -73.93,
    },
  })
  .execute();

// Geo Bounding Box Query
const results = await User.query<User>()
  .geoBoundingBox("location", {
    topLeft: {
      lat: 40.73,
      lon: -74.1,
    },
    bottomRight: {
      lat: 40.01,
      lon: -73.86,
    },
  })
  .execute();
```

## Error Handling

TypenSearch may throw the following errors:

```typescript
try {
  await user.save();
} catch (error) {
  if (error instanceof ValidationError) {
    // Validation failed
    console.error("Validation failed:", error.message);
  } else if (error instanceof ConnectionError) {
    // OpenSearch connection failed
    console.error("Connection failed:", error.message);
  } else {
    // Other errors
    console.error("Unknown error:", error);
  }
}
```

## Best Practices

### Index Settings Optimization

```typescript
@OpenSearchIndex({
  name: 'products',
  settings: {
    'index.mapping.total_fields.limit': 2000,
    'index.number_of_shards': 3,
    'index.number_of_replicas': 1,
    'index.refresh_interval': '5s',
    analysis: {
      analyzer: {
        my_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'stop', 'snowball']
        }
      }
    }
  }
})
```

### Efficient Searching

```typescript
const results = await Product.search({
  _source: ["name", "price"], // Only fetch needed fields
  query: {
    bool: {
      must: [{ match: { name: "phone" } }],
      filter: [{ range: { price: { gte: 100, lte: 200 } } }],
    },
  },
  sort: [{ price: "asc" }],
  from: 0,
  size: 20,
});
```

### Migration Best Practices

1. Always test with `dryRun` first
2. Use `backup: true` option for important changes
3. Set `waitForCompletion: false` for large datasets and run in background
4. Monitor migration progress using `getMigrationHistory()`

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/something-new`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/something-new`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- Report bugs and request features through issues
- Contribute code through pull requests
- Suggest documentation improvements
- Share use cases

#### Aggregations

TypenSearch provides powerful aggregation capabilities for data analysis.

```typescript
// Metric Aggregations
const results = await User.query<User>()
  .match("role", "developer")
  .aggs(
    "age_stats",
    (a) => a.stats("age") // Calculate statistics (min, max, avg, sum)
  )
  .aggs(
    "avg_salary",
    (a) => a.avg("salary") // Calculate average
  )
  .execute();

// Bucket Aggregations
const results = await User.query<User>()
  .aggs(
    "job_categories",
    (a) =>
      a
        .terms("job_title") // Group by job title
        .subAggs("avg_age", (sa) => sa.avg("age")) // Add sub-aggregation
  )
  .execute();

// Date Histogram Aggregation
const results = await User.query<User>()
  .aggs("signups_over_time", (a) =>
    a.dateHistogram("createdAt", {
      interval: "1d", // Daily intervals
      format: "yyyy-MM-dd",
    })
  )
  .execute();

// Range Aggregation
const results = await User.query<User>()
  .aggs("salary_ranges", (a) =>
    a.range("salary", [
      { to: 50000 },
      { from: 50000, to: 100000 },
      { from: 100000 },
    ])
  )
  .execute();

// Nested Aggregations
const results = await User.query<User>()
  .aggs("job_categories", (a) =>
    a
      .terms("job_title")
      .subAggs("experience_stats", (sa) =>
        sa
          .stats("years_of_experience")
          .subAggs("salary_stats", (ssa) => ssa.stats("salary"))
      )
  )
  .execute();
```

#### Aggregation Options

##### MetricAggregationOptions

```typescript
interface MetricAggregationOptions {
  field: string;
  script?: string;
  missing?: unknown;
}
```

##### BucketAggregationOptions

```typescript
interface BucketAggregationOptions {
  field: string;
  size?: number;
  minDocCount?: number;
  order?: {
    [key: string]: "asc" | "desc";
  };
  missing?: unknown;
}
```

##### DateHistogramAggregationOptions

```typescript
interface DateHistogramAggregationOptions {
  field: string;
  interval?: string;
  format?: string;
  timeZone?: string;
  minDocCount?: number;
  missing?: unknown;
}
```

##### RangeAggregationOptions

```typescript
interface RangeAggregationOptions {
  field: string;
  ranges: Array<{
    key?: string;
    from?: number;
    to?: number;
  }>;
  keyed?: boolean;
}
```
