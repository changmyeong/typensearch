import { initialize, OpenSearchIndex, Field, Model } from "../../index";
import { Client } from "@opensearch-project/opensearch";

@OpenSearchIndex({ name: "e2e_users" })
class E2EUser extends Model {
  @Field({ type: "keyword" })
  username!: string;

  @Field({ type: "keyword" })
  email!: string;

  @Field({ type: "integer" })
  age!: number;

  @Field({ type: "date" })
  createdAt!: Date;

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
}

describe("QueryBuilder E2E Tests", () => {
  let client: Client;

  beforeAll(async () => {
    client = await initialize({
      node: "http://localhost:9200",
    });
  });

  beforeEach(async () => {
    const users = [
      {
        username: "user1",
        email: "user1@example.com",
        age: 25,
        createdAt: new Date("2023-01-01"),
        address: {
          street: "123 Main St",
          city: "New York",
          country: "USA",
        },
      },
      {
        username: "user2",
        email: "user2@example.com",
        age: 30,
        createdAt: new Date("2023-02-01"),
        address: {
          street: "456 Oak Ave",
          city: "Los Angeles",
          country: "USA",
        },
      },
      {
        username: "user3",
        email: "user3@example.com",
        age: 35,
        createdAt: new Date("2023-03-01"),
        address: {
          street: "789 Pine St",
          city: "Chicago",
          country: "USA",
        },
      },
    ];

    for (const user of users) {
      await E2EUser.index(user, true);
    }
  });

  afterEach(async () => {
    await client.deleteByQuery({
      index: "e2e_users",
      body: {
        query: {
          match_all: {},
        },
      },
      refresh: true,
    });
  });

  describe("Basic Queries", () => {
    it("should execute match query", async () => {
      const results = await E2EUser.query<E2EUser>()
        .match("username", "user1")
        .execute();

      expect(results.hits.total.value).toBe(1);
      expect(results.hits.hits[0]._source.username).toBe("user1");
    });

    it("should execute term query", async () => {
      const results = await E2EUser.query<E2EUser>().term("age", 25).execute();

      expect(results.hits.total.value).toBe(1);
      expect(results.hits.hits[0]._source.age).toBe(25);
    });

    it("should execute range query", async () => {
      const results = await E2EUser.query<E2EUser>()
        .range("age", { gte: 30 })
        .execute();

      expect(results.hits.total.value).toBe(2);
      expect(results.hits.hits[0]._source.age).toBeGreaterThanOrEqual(30);
    });
  });

  describe("Boolean Queries", () => {
    it("should execute must query", async () => {
      const results = await E2EUser.query<E2EUser>()
        .bool((builder) => {
          builder.must("age", 25);
        })
        .execute();

      expect(results.hits.total.value).toBe(1);
      expect(results.hits.hits[0]._source.age).toBe(25);
    });

    it("should execute mustNot query", async () => {
      const results = await E2EUser.query<E2EUser>()
        .bool((builder) => {
          builder.mustNot("age", 25);
        })
        .execute();

      expect(results.hits.total.value).toBe(2);
      expect(results.hits.hits[0]._source.age).not.toBe(25);
    });

    it("should execute should query", async () => {
      const results = await E2EUser.query<E2EUser>()
        .bool((builder) => {
          builder.should("age", 25);
          builder.should("age", 30);
        })
        .execute();

      expect(results.hits.total.value).toBe(2);
      expect([25, 30]).toContain(results.hits.hits[0]._source.age);
    });

    it("should execute filter query", async () => {
      const results = await E2EUser.query<E2EUser>()
        .bool((builder) => {
          builder.filter("age", 25);
        })
        .execute();

      expect(results.hits.total.value).toBe(1);
      expect(results.hits.hits[0]._source.age).toBe(25);
    });
  });

  describe("Sorting and Pagination", () => {
    it("should sort results", async () => {
      const results = await E2EUser.query<E2EUser>()
        .sort("age", "asc")
        .execute();

      expect(results.hits.hits[0]._source.age).toBe(25);
      expect(results.hits.hits[1]._source.age).toBe(30);
      expect(results.hits.hits[2]._source.age).toBe(35);
    });

    it("should paginate results", async () => {
      const results = await E2EUser.query<E2EUser>().from(1).size(1).execute();

      expect(results.hits.hits).toHaveLength(1);
    });
  });

  describe("Aggregations", () => {
    it("should execute metric aggregation", async () => {
      const results = await E2EUser.query<E2EUser>()
        .aggs("age_stats", (builder) => {
          builder.extendedStats("age");
        })
        .execute();

      expect(results.aggregations).toBeDefined();
      expect(results.aggregations?.age_stats).toBeDefined();
    });

    it("should execute bucket aggregation", async () => {
      const results = await E2EUser.query<E2EUser>()
        .terms("age_terms", {
          field: "age",
          size: 10,
        })
        .execute();

      expect(results.aggregations).toBeDefined();
      expect(results.aggregations?.age_terms.buckets).toHaveLength(3);
    });

    it("should execute nested aggregation", async () => {
      const results = await E2EUser.query<E2EUser>()
        .terms("city_terms", {
          field: "address.city.keyword",
          size: 10,
        })
        .aggs("city_stats", (builder) => {
          builder.avg("age");
        })
        .execute();

      console.log(
        "[E2E] nested aggregation result:",
        JSON.stringify(results.aggregations, null, 2)
      );

      expect(results.aggregations).toBeDefined();
      expect(results.aggregations?.city_terms.buckets).toHaveLength(3);
      expect(
        results.aggregations?.city_terms.buckets[0].city_stats
      ).toBeDefined();
    });
  });
});
