# TypenSearch

TypenSearch is a simple and lightweight Object Document Mapper (ODM) for OpenSearch, designed to help developers easily interact with OpenSearch indices by defining schemas, managing indices, and performing CRUD operations. It is inspired by Typegoose, a popular MongoDB ODM, and is suitable for developers familiar with TypeScript.

## Features

- Define schemas with decorators
- Automatically manage indices
- Perform CRUD operations
- Supports custom field options
- TypeScript support

## Installation

```bash
npm install --save typensearch
```

## Usage

1. Define a schema for your document:

```typescript
import {
  OpenSearchIndex,
  Field,
  DocumentId,
  CreatedAt,
  UpdatedAt,
  Model,
  initialize,
  opensearchClient,
} from 'typensearch';

/**
 * Initializes the TypenSearch
 *
 * @param {Object} opensearchClientOptions - The options for the OpenSearch client.
 * @param {Object} typensearchOptions - The options for TypenSearch.
 * @returns {Promise<void>} A Promise that resolves when the initialization is complete.
 */

initialize(
  { node: 'http://localhost:9200' },
  // Models decorated with OpenSearchIndex
  { createIndexIfNotExists: [ User ] },
});

@OpenSearchIndex({
  name: 'user',
  numberOfShards: 2,
  numberOfReplicas: 1,
})
class User extends Model {
  @Field({ type: 'text', required: true })
  username: string;

  @Field({ type: 'keyword', required: true })
  email: string;

  @Field({
    type: 'date',
    boost: 3,
    default: Date.now,
  })
  birthdate: Date;

  @Field({ type: 'integer', default: 0 })
  followerCount: number;

  @Field({
    type: 'object',
    required: true,
    properties: {
      country: { type: 'keyword', required: false },
      address: { type: 'keyword', required: true },
      nickname: { type: 'keyword', required: true },
    },
  })
  others: {
    country?: string;
    address: string;
    nickname: string;
  };

  @CreatedAt()
  createdAt: Date;

  @UpdatedAt()
  updatedAt: Date;
}
```

2. Perform CRUD operations:

```typescript
// Create a document
const newUser = await User.index({
  _id: 'user1',
  username: 'john_doe',
  email: 'john.doe@example.com',
  birthdate: new Date('1990-01-01'),
});

// Update multiple documents
const updatedDocs = await User.updateMany(
  { username: 'john_doe' },
  { email: 'john.doe2@example.com' },
);

// Delete multiple documents
const deletedDocs = await User.deleteMany({ username: 'john_doe' });

// Get a document by ID
const user = await User.get('user1');

// Change fields of the document and save it.
user.username = 'alice';
user.email = 'alice@bitcoin.com';
await user.save(true);

// Delete a document
await user.delete();

// Search with OpenSearch filter query
// Set document size to 10
await User.search({
  query: {
    bool: {
      // ...
    },
  },
}, 10);

// You can use OpenSearch client directly for unsupported methods.
await opensearchClient.bulk({ body });
```

## API

### `OpenSearchIndex(options: IndexOptions): ClassDecorator`

- Decorator to define an OpenSearch index and map it to a class.
- `IndexOptions.name`: Set the index name. It uses String.toLowerCase() internally. default is the name of the class.
- `IndexOptions.numberOfShards`: Set the shard number
- `IndexOptions.numberOfReplicas`: Set the replica number

### `Field(options: FieldOptions): PropertyDecorator`

- Decorator to define a field in the schema.
- Supports various field options.

### `CreatedAt(): PropertyDecorator`

- Decorator to define a createdAt field with a date type.

### `UpdatedAt(): PropertyDecorator`

- Decorator to define an updatedAt field with a date type.

### `Model.index<T>(doc: Partial<T>, refresh?: boolean): Promise<T>`

- Index a document.
- Refresh the index if `refresh` is true.
- OpenSearch API response will be returned.

### `Model.updateMany<T>(query: Partial<T>, updates: Partial<T>, options?: UpdateOptions): Promise<ApiResponse>`

- Update multiple documents matching the query.
- Supports various update options.
- OpenSearch API response will be returned.

### `Model.deleteMany<T>(query: Partial<T>, options?: DeleteOptions): Promise<ApiResponse>`

- Delete multiple documents matching the query.
- Supports various delete options.
- OpenSearch API response will be returned.

### `Model.get<T>(id: string): Promise<T | null>`

- Get a document by ID.
- Returns null if the document does not exist.

### `Model.delete<T>(id: string, refresh?: boolean): Promise<void>`

- Delete a document matching the id.
- Returns undefined if success

### `model.delete(refresh?: boolean): Promise<ApiResponse>`

- Delete the current document.

### `model.save(refresh?: boolean): Promise<void>`

- Save the current document.
- Refresh the index if `refresh` is true.
- Returns undefined if success

### `Model.search(body: QueryObject, size?: number)`

- Search the index.
- OpenSearch API response will be returned.

## Contributing

1. **Fork** the repository to your GitHub account.
2. **Clone** your forked repository locally.
3. **Create a branch** for your feature or bugfix.
4. **Install dependencies** with `npm install`.
5. **Implement** your changes and follow the project's coding style.
6. **Commit** your changes with a clear and concise message.
7. **Push** your changes to your forked repository.
8. **Submit a pull request** to the original repository.