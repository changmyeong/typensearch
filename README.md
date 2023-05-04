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
npm install --save typesearch
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
  Model
} from 'typesearch';

// Initialize OpenSearch Client globally.
setOpenSearchClient({ node: 'http://localhost:9200' })

@OpenSearchIndex({
  name: 'user',
  clientOptions: { node: 'http://localhost:9200' },
  createIfNotExists: true,
})
class User extends Model {
  @DocumentId()
  public _id: string;

  @Field({ type: 'text', required: true })
  public username: string;

  @Field({ type: 'text', required: true })
  public email: string;

  @Field({ type: 'date' })
  public birthdate: Date;

  @CreatedAt()
  public createdAt: Date;

  @UpdatedAt()
  public updatedAt: Date;
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

// Delete a document
await user.delete();
```

## API

### `OpenSearchIndex(options: IndexOptions): ClassDecorator`

- Decorator to define an OpenSearch index and map it to a class.
- `IndexOptions.name`: Set the index name. It uses String.toLowerCase() internally. default is the name of the class.
- `IndexOptions.createIfNotExists`: Create Index if it does not exist.
- `IndexOptions.clientOptions`: `ClientOptions` of `@opensearch-project/opensearch`

### `Field(options: FieldOptions): PropertyDecorator`

- Decorator to define a field in the schema.
- Supports various field options.

### `CreatedAt(): PropertyDecorator`

- Decorator to define a createdAt field with a date type.

### `UpdatedAt(): PropertyDecorator`

- Decorator to define an updatedAt field with a date type.

### `Model.index<T>(doc: Partial<T>, refresh?: boolean): Promise<ApiResponse>`

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

### `Model.delete(): Promise<ApiResponse>`

- Delete the current document.

## Contributing

1. **Fork** the repository to your GitHub account.
2. **Clone** your forked repository locally.
3. **Create a branch** for your feature or bugfix.
4. **Install dependencies** with `npm install`.
5. **Implement** your changes and follow the project's coding style.
6. **Commit** your changes with a clear and concise message.
7. **Push** your changes to your forked repository.
8. **Submit a pull request** to the original repository.