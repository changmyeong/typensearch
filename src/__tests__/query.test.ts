import { initialize } from "../client";
import { Field, OpenSearchIndex } from "../decorator";
import { Model } from "../model";
import "jest";
import { BatchProcessor } from "../batch";

jest.mock("../client", () => ({
  initialize: jest.fn(),
  opensearchClient: {
    search: jest.fn().mockResolvedValue({
      body: {
        hits: {
          total: { value: 2, relation: "eq" },
          hits: [
            {
              _index: "test_index",
              _id: "1",
              _score: 1.0,
              _source: {
                name: "John Doe",
                age: 25,
                tags: ["developer", "typescript"],
                address: {
                  city: "New York",
                },
              },
            },
            {
              _index: "test_index",
              _id: "2",
              _score: 0.8,
              _source: {
                name: "Jane Smith",
                age: 28,
                tags: ["designer", "ui/ux"],
                address: {
                  city: "Los Angeles",
                },
              },
            },
          ],
        },
        aggregations: {
          avg_age: { value: 30 },
          min_age: { value: 25 },
          max_age: { value: 35 },
          job_tags: {
            buckets: [
              {
                key: "developer",
                doc_count: 10,
                tag_stats: {
                  avg: { value: 28 },
                  max: { value: 35 },
                },
              },
              {
                key: "designer",
                doc_count: 8,
                tag_stats: {
                  avg: { value: 27 },
                  max: { value: 32 },
                },
              },
              {
                key: "manager",
                doc_count: 5,
                tag_stats: {
                  avg: { value: 35 },
                  max: { value: 40 },
                },
              },
              {
                key: "analyst",
                doc_count: 4,
                tag_stats: {
                  avg: { value: 30 },
                  max: { value: 38 },
                },
              },
              {
                key: "tester",
                doc_count: 3,
                tag_stats: {
                  avg: { value: 26 },
                  max: { value: 30 },
                },
              },
              {
                key: "devops",
                doc_count: 2,
                tag_stats: {
                  avg: { value: 29 },
                  max: { value: 34 },
                },
              },
            ],
          },
          age_stats: {
            avg: { value: 30 },
            max: { value: 35 },
            extended_stats: {
              count: 10,
              min: 25,
              max: 35,
              avg: 30,
              sum: 300,
              sum_of_squares: 9100,
              variance: 8.333333333333334,
              std_deviation: 2.886751345948129,
            },
            tag_stats: {
              avg: { value: 28 },
            },
          },
          posts_over_time: {
            buckets: [
              { key_as_string: "2024-01", doc_count: 10 },
              { key_as_string: "2024-02", doc_count: 15 },
            ],
          },
          age_ranges: {
            buckets: [
              { key: "young", doc_count: 1, from: 20, to: 30 },
              { key: "middle", doc_count: 8, from: 30, to: 40 },
              { key: "senior", doc_count: 3, from: 40, to: 50 },
            ],
          },
        },
      },
    }),
    bulk: jest.fn().mockResolvedValue({
      body: {
        took: 30,
        errors: false,
        items: [],
      },
    }),
    index: jest.fn().mockResolvedValue({
      body: {
        _index: "test_index",
        _id: "1",
        _version: 1,
        result: "created",
        _shards: {
          total: 2,
          successful: 2,
          failed: 0,
        },
        _seq_no: 0,
        _primary_term: 1,
      },
    }),
    indices: {
      create: jest.fn().mockResolvedValue({
        body: { acknowledged: true },
      }),
      delete: jest.fn().mockResolvedValue({
        body: { acknowledged: true },
      }),
      exists: jest.fn().mockResolvedValue({
        body: true,
      }),
      get: jest.fn().mockResolvedValue({
        body: {
          test_index: {
            mappings: {
              properties: {},
            },
          },
        },
      }),
      putMapping: jest.fn().mockResolvedValue({
        body: { acknowledged: true },
      }),
    },
  },
}));

describe("QueryBuilder", () => {
  beforeAll(async () => {
    await initialize({
      node: "http://localhost:9200",
      ssl: {
        rejectUnauthorized: false,
      },
    });
    // BatchProcessor 초기화
    BatchProcessor.getInstance();
  });

  afterEach(async () => {
    // 각 테스트 후 BatchProcessor 정리
    const batchProcessor = BatchProcessor.getInstance();
    batchProcessor.destroy();
  });

  afterAll(async () => {
    // 전체 테스트 후 BatchProcessor 정리
    const batchProcessor = BatchProcessor.getInstance();
    batchProcessor.destroy();
  });

  @OpenSearchIndex({ name: "test_query_builder" })
  class TestModel extends Model {
    @Field({ type: "keyword" })
    name: string;

    @Field({ type: "integer" })
    age: number;

    @Field({ type: "text" })
    description: string;

    @Field({ type: "keyword" })
    tags: string[];

    @Field({ type: "nested" })
    address: {
      street: string;
      city: string;
      country: string;
    };
  }

  describe("Basic Queries", () => {
    it("should create match query", async () => {
      const query = TestModel.query<TestModel>()
        .match("name", "John", { operator: "AND" })
        .size(10);

      const searchBody = (query as any).query;
      expect(searchBody.query.match.name).toEqual({
        query: "John",
        operator: "AND",
      });
      expect((query as any).searchOptions.size).toBe(10);
    });

    it("should create term query", async () => {
      const query = TestModel.query<TestModel>().term("age", 25, {
        boost: 2.0,
      });

      const searchBody = (query as any).query;
      expect(searchBody.query.term.age).toEqual({
        value: 25,
        boost: 2.0,
      });
    });

    it("should create range query", async () => {
      const query = TestModel.query<TestModel>().range("age", {
        gte: 20,
        lte: 30,
      });

      const searchBody = (query as any).query;
      expect(searchBody.query.range.age).toEqual({
        gte: 20,
        lte: 30,
      });
    });
  });

  describe("Boolean Queries", () => {
    it("should create bool query with must and should", async () => {
      const query = TestModel.query<TestModel>().bool((q) =>
        q
          .must("name", "John")
          .must("age", 25)
          .should("tags", ["developer", "typescript"])
      );

      const searchBody = (query as any).query;
      expect(searchBody.query.bool.must).toHaveLength(2);
      expect(searchBody.query.bool.should).toHaveLength(1);
      expect(searchBody.query.bool.must[0].term.name.value).toBe("John");
      expect(searchBody.query.bool.must[1].term.age.value).toBe(25);
      expect(searchBody.query.bool.should[0].terms.tags).toEqual([
        "developer",
        "typescript",
      ]);
    });

    it("should create bool query with filter", async () => {
      const query = TestModel.query<TestModel>().bool((q) =>
        q.filter("age", { gte: 20, lte: 30 }).filter("tags", "active")
      );

      const searchBody = (query as any).query;
      expect(searchBody.query.bool.filter).toHaveLength(2);
      expect(searchBody.query.bool.filter[0].range.age).toEqual({
        gte: 20,
        lte: 30,
      });
      expect(searchBody.query.bool.filter[1].term.tags).toEqual("active");
    });
  });

  describe("Search Options", () => {
    it("should set sort options", async () => {
      const query = TestModel.query<TestModel>()
        .sort("createdAt", "desc")
        .sort("name", { order: "asc", missing: "_last" });

      const searchOptions = (query as any).searchOptions;
      expect(searchOptions.sort).toHaveLength(2);
      expect(searchOptions.sort[0].createdAt.order).toBe("desc");
      expect(searchOptions.sort[1].name).toEqual({
        order: "asc",
        missing: "_last",
      });
    });

    it("should set pagination options", async () => {
      const query = TestModel.query<TestModel>().from(10).size(20);

      const searchOptions = (query as any).searchOptions;
      expect(searchOptions.from).toBe(10);
      expect(searchOptions.size).toBe(20);
    });

    it("should set source filtering", async () => {
      const query = TestModel.query<TestModel>().source({
        includes: ["name", "age"],
        excludes: ["description"],
      });

      const searchOptions = (query as any).searchOptions;
      expect(searchOptions._source).toEqual({
        includes: ["name", "age"],
        excludes: ["description"],
      });
    });
  });

  describe("Query Execution", () => {
    beforeEach(async () => {
      // 테스트 데이터 생성
      await TestModel.index({
        name: "John Doe",
        age: 25,
        description: "Software Developer",
        tags: ["developer", "typescript"],
        createdAt: new Date(),
      });

      await TestModel.index({
        name: "Jane Smith",
        age: 30,
        description: "Data Scientist",
        tags: ["data", "python"],
        createdAt: new Date(),
      });

      // 인덱스 리프레시
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it("should execute search and return results", async () => {
      const results = await TestModel.query<TestModel>()
        .match("name", "John")
        .execute();

      expect(results.hits.total.value).toBeGreaterThan(0);
      expect(results.hits.hits[0]._source.name).toBe("John Doe");
    });

    it("should execute bool query and return filtered results", async () => {
      const results = await TestModel.query<TestModel>()
        .bool((q) =>
          q.must("tags", ["developer"]).filter("age", { gte: 20, lte: 30 })
        )
        .execute();

      expect(results.hits.total.value).toBeGreaterThan(0);
      expect(results.hits.hits[0]._source.tags).toContain("developer");
      expect(results.hits.hits[0]._source.age).toBe(25);
    });
  });

  describe("Aggregations", () => {
    beforeEach(async () => {
      // 테스트 데이터 생성
      await TestModel.bulkIndex([
        {
          name: "John Doe",
          age: 25,
          description: "Software Developer",
          tags: ["developer", "typescript"],
          createdAt: new Date("2024-01-01"),
        },
        {
          name: "Jane Smith",
          age: 30,
          description: "Data Scientist",
          tags: ["data", "python"],
          createdAt: new Date("2024-01-15"),
        },
        {
          name: "Bob Johnson",
          age: 35,
          description: "DevOps Engineer",
          tags: ["devops", "kubernetes"],
          createdAt: new Date("2024-02-01"),
        },
      ]);

      // 인덱스 리프레시
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it("should execute metric aggregations", async () => {
      const results = await TestModel.query<TestModel>()
        .avg("avg_age", { field: "age" })
        .min("min_age", { field: "age" })
        .max("max_age", { field: "age" })
        .execute();

      expect(results.aggregations).toBeDefined();
      expect(results.aggregations?.avg_age.value).toBe(30);
      expect(results.aggregations?.min_age.value).toBe(25);
      expect(results.aggregations?.max_age.value).toBe(35);
    });

    it("should execute terms aggregation", async () => {
      const results = await TestModel.query<TestModel>()
        .terms("job_tags", {
          field: "tags",
          size: 10,
        })
        .execute();

      expect(results.aggregations).toBeDefined();
      expect(results.aggregations?.job_tags.buckets).toHaveLength(6);
      expect(
        results.aggregations?.job_tags.buckets.map(
          (b: { key: string }) => b.key
        )
      ).toContain("developer");
      expect(
        results.aggregations?.job_tags.buckets.map(
          (b: { key: string }) => b.key
        )
      ).toContain("devops");
    });

    it("should execute date histogram aggregation", async () => {
      const results = await TestModel.query<TestModel>()
        .dateHistogram("posts_over_time", {
          field: "createdAt",
          calendar_interval: "month",
        })
        .execute();

      expect(results.aggregations).toBeDefined();
      expect(results.aggregations?.posts_over_time.buckets).toHaveLength(2);
    });

    it("should execute range aggregation", async () => {
      const results = await TestModel.query<TestModel>()
        .rangeAggregation("age_ranges", {
          field: "age",
          ranges: [
            { to: 30, key: "young" },
            { from: 30, to: 40, key: "middle" },
            { from: 40, key: "senior" },
          ],
        })
        .execute();

      expect(results.aggregations).toBeDefined();
      expect(results.aggregations?.age_ranges.buckets).toHaveLength(3);
      expect(
        results.aggregations?.age_ranges.buckets.find(
          (b: { key: string }) => b.key === "young"
        )
      ).toBeDefined();
    });

    it("should execute nested aggregations", async () => {
      const results = await TestModel.query<TestModel>()
        .terms("job_tags", {
          field: "tags",
          size: 10,
        })
        .aggs("tag_stats", (builder) => builder.avg("age").max("age"))
        .execute();

      expect(results.aggregations).toBeDefined();
      expect(results.aggregations?.job_tags.buckets[0].tag_stats).toBeDefined();
      expect(
        results.aggregations?.job_tags.buckets[0].tag_stats.avg
      ).toBeDefined();
    });

    it("should execute aggregation query", async () => {
      const results = await TestModel.query<TestModel>()
        .aggs("age_stats", (a) =>
          a
            .avg("age")
            .max("age")
            .extendedStats("age")
            .subAggs("tag_stats", (sub) => sub.avg("age"))
        )
        .execute();

      expect(results.aggregations?.age_stats).toBeDefined();
      expect(results.aggregations?.age_stats.avg).toBeDefined();
      expect(results.aggregations?.age_stats.max).toBeDefined();
      expect(results.aggregations?.age_stats.extended_stats).toBeDefined();
      expect(results.aggregations?.age_stats.tag_stats).toBeDefined();
    });

    afterAll(async () => {
      const batchProcessor = BatchProcessor.getInstance();
      batchProcessor.destroy();
    });
  });

  describe("Additional Query Types", () => {
    beforeEach(async () => {
      // 테스트 데이터 생성
      await TestModel.bulkIndex([
        {
          name: "John Doe",
          age: 25,
          description: "Software Developer",
          tags: ["developer", "typescript"],
          createdAt: new Date("2024-01-01"),
          address: {
            street: "123 Main St",
            city: "New York",
            country: "USA",
          },
        },
        {
          name: "Jane Smith",
          age: 30,
          description: "Data Scientist",
          tags: ["data", "python"],
          createdAt: new Date("2024-01-15"),
          address: {
            street: "456 Park Ave",
            city: "Boston",
            country: "USA",
          },
        },
      ]);

      // 인덱스 리프레시
      await new Promise((resolve) => setTimeout(resolve, 1000));
    });

    it("should execute nested query", async () => {
      const results = await TestModel.query<TestModel>()
        .nested("address", (builder) =>
          builder.match("address.city", "New York")
        )
        .execute();

      expect(results.hits.total.value).toBeGreaterThan(0);
      expect(results.hits.hits[0]._source.address.city).toBe("New York");
    });

    it("should execute exists query", async () => {
      const results = await TestModel.query<TestModel>()
        .exists("tags")
        .execute();

      expect(results.hits.total.value).toBe(2);
    });

    it("should execute wildcard query", async () => {
      const results = await TestModel.query<TestModel>()
        .wildcard("name", "J*")
        .execute();

      expect(results.hits.total.value).toBe(2);
      expect(results.hits.hits.map((hit) => hit._source.name)).toContain(
        "John Doe"
      );
      expect(results.hits.hits.map((hit) => hit._source.name)).toContain(
        "Jane Smith"
      );
    });

    it("should execute fuzzy query", async () => {
      const results = await TestModel.query<TestModel>()
        .fuzzy("name", "Jon", { fuzziness: "AUTO" })
        .execute();

      expect(results.hits.total.value).toBeGreaterThan(0);
      expect(results.hits.hits[0]._source.name).toBe("John Doe");
    });

    it("should execute prefix query", async () => {
      const results = await TestModel.query<TestModel>()
        .prefix("name", "Jo", { case_insensitive: true })
        .execute();

      expect(results.hits.total.value).toBeGreaterThan(0);
      expect(results.hits.hits[0]._source.name).toBe("John Doe");
    });

    it("should combine nested query with bool query", async () => {
      const results = await TestModel.query<TestModel>()
        .bool((q) =>
          q.must("age", { gte: 20, lte: 30 }).must("address.city", "New York")
        )
        .execute();

      expect(results.hits.total.value).toBeGreaterThan(0);
      expect(results.hits.hits[0]._source.age).toBeLessThanOrEqual(30);
      expect(results.hits.hits[0]._source.address.city).toBe("New York");
    });

    it("should execute nested query with score mode", async () => {
      const results = await TestModel.query<TestModel>()
        .nested("address", (builder) =>
          builder.match("address.city", "New York")
        )
        .execute();

      expect(results.hits.total.value).toBeGreaterThan(0);
      expect(results.hits.hits[0]._source.address.city).toBe("New York");
    });

    afterAll(async () => {
      const batchProcessor = BatchProcessor.getInstance();
      batchProcessor.destroy();
    });
  });
});
