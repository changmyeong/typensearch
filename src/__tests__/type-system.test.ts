import { OpenSearchIndex, Field, Model } from "../index";
import { FieldType } from "../types";
import { Client } from "@opensearch-project/opensearch";

// Mock the opensearchClient
jest.mock("../client", () => {
  const mockSearchResponse = {
    body: {
      hits: {
        total: { value: 0, relation: "eq" as const },
        max_score: 0 as number | null,
        hits: [] as Array<{
          _index: string;
          _id: string;
          _score: number;
          _source: any;
        }>,
      },
      took: 1,
      timed_out: false,
      aggregations: {},
    },
  };

  const mockClient = {
    search: jest.fn().mockResolvedValue(mockSearchResponse),
    indices: {
      create: jest.fn().mockResolvedValue({ acknowledged: true }),
      putMapping: jest.fn().mockResolvedValue({ acknowledged: true }),
    },
  };

  return {
    opensearchClient: mockClient,
  };
});

describe("Type System Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Nested Object Tests", () => {
    it("should handle nested object types", async () => {
      @OpenSearchIndex({ name: "test-users" })
      class UserModel extends Model {
        @Field({
          type: "object" as FieldType,
          properties: {
            street: { type: "text" as FieldType },
            city: { type: "keyword" as FieldType },
            country: { type: "keyword" as FieldType },
          },
        })
        address: {
          street: string;
          city: string;
          country: string;
        };

        @Field({
          type: "nested" as FieldType,
          properties: {
            name: { type: "text" as FieldType },
            quantity: { type: "integer" as FieldType },
          },
        })
        orders: Array<{
          name: string;
          quantity: number;
        }>;
      }

      const mapping = UserModel.getMapping();
      expect(mapping.properties.address.type).toBe("object");
      expect(mapping.properties.address.properties).toEqual({
        street: { type: "text" },
        city: { type: "keyword" },
        country: { type: "keyword" },
      });

      expect(mapping.properties.orders.type).toBe("nested");
      expect(mapping.properties.orders.properties).toEqual({
        name: { type: "text" },
        quantity: { type: "integer" },
      });

      // Test nested query
      const results = await UserModel.query()
        .nested("orders", (q) =>
          q.bool((b) =>
            b.must("name", "Product A").must("quantity", { gte: 10 })
          )
        )
        .execute();

      expect(results).toBeDefined();
    });
  });

  describe("Union Type Tests", () => {
    it("should handle union types", async () => {
      type Status = "active" | "inactive" | "pending";

      @OpenSearchIndex({ name: "test-products" })
      class ProductModel extends Model {
        @Field({
          type: "keyword" as FieldType,
          validate: (value: Status) =>
            ["active", "inactive", "pending"].includes(value),
        })
        status: Status;

        @Field({ type: "text" as FieldType })
        identifier: string | number;
      }

      const mapping = ProductModel.getMapping();
      expect(mapping.properties.status.type).toBe("keyword");
      expect(mapping.properties.identifier.type).toBe("text");

      // Test union type validation
      const product = new ProductModel();
      product.status = "active";
      expect(() => product.validate()).not.toThrow();

      product.status = "unknown" as Status;
      expect(() => product.validate()).toThrow();
    });
  });

  describe("Interface Inheritance Tests", () => {
    interface Timestamps {
      createdAt: Date;
      updatedAt: Date;
    }

    interface Metadata {
      version: number;
      tags: string[];
    }

    @OpenSearchIndex({ name: "test-documents" })
    class DocumentModel extends Model implements Timestamps, Metadata {
      @Field({ type: "date" as FieldType })
      createdAt: Date;

      @Field({ type: "date" as FieldType })
      updatedAt: Date;

      @Field({ type: "integer" as FieldType })
      version: number;

      @Field({ type: "keyword" as FieldType })
      tags: string[];
    }

    it("should inherit interface properties", async () => {
      const mapping = DocumentModel.getMapping();
      expect(mapping.properties.createdAt.type).toBe("date");
      expect(mapping.properties.updatedAt.type).toBe("date");
      expect(mapping.properties.version.type).toBe("integer");
      expect(mapping.properties.tags.type).toBe("keyword");

      // Test date range query
      const results = await DocumentModel.query()
        .range("createdAt", {
          gte: "2023-01-01",
          lte: "2023-12-31",
        })
        .execute();

      expect(results).toBeDefined();
    });
  });
});
