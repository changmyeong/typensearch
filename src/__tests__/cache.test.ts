import { QueryCache } from "../cache";
import { SearchResult } from "../types";
import "jest";

describe("QueryCache", () => {
  let queryCache: QueryCache;

  beforeEach(() => {
    queryCache = QueryCache.getInstance();
    queryCache.clear();
  });

  afterAll(() => {
    const instance = QueryCache.getInstance();
    instance.clear();
  });

  it("should be a singleton", () => {
    const instance1 = QueryCache.getInstance();
    const instance2 = QueryCache.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("should store and retrieve data", () => {
    const key = "test-key";
    const data: SearchResult<unknown> = {
      hits: {
        total: { value: 1, relation: "eq" },
        max_score: 1.0,
        hits: [
          {
            _index: "test",
            _id: "1",
            _score: 1.0,
            _source: { value: "test-data" },
          },
        ],
      },
      took: 1,
      timed_out: false,
    };
    queryCache.set(key, data);
    expect(queryCache.get(key)).toEqual(data);
  });

  it("should respect TTL", async () => {
    const key = "ttl-test";
    const data: SearchResult<unknown> = {
      hits: {
        total: { value: 1, relation: "eq" },
        max_score: 1.0,
        hits: [
          {
            _index: "test",
            _id: "1",
            _score: 1.0,
            _source: { value: "test-data" },
          },
        ],
      },
      took: 1,
      timed_out: false,
    };
    queryCache.set(key, data, 100); // 100ms TTL

    expect(queryCache.get(key)).toEqual(data);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(queryCache.get(key)).toBeNull();
  });

  it("should generate consistent cache keys", () => {
    const index = "test-index";
    const query1 = { match: { field: "value" } };
    const query2 = { match: { field: "value" } };
    const key1 = queryCache.generateKey(index, query1);
    const key2 = queryCache.generateKey(index, query2);
    expect(key1).toBe(key2);
  });

  it("should clear all cached data", () => {
    const data: SearchResult<unknown> = {
      hits: {
        total: { value: 1, relation: "eq" },
        max_score: 1.0,
        hits: [
          {
            _index: "test",
            _id: "1",
            _score: 1.0,
            _source: { value: "data1" },
          },
        ],
      },
      took: 1,
      timed_out: false,
    };
    queryCache.set("key1", data);
    queryCache.set("key2", data);
    queryCache.clear();
    expect(queryCache.get("key1")).toBeNull();
    expect(queryCache.get("key2")).toBeNull();
  });

  it("should delete specific cache entry", () => {
    const data: SearchResult<unknown> = {
      hits: {
        total: { value: 1, relation: "eq" },
        max_score: 1.0,
        hits: [
          {
            _index: "test",
            _id: "1",
            _score: 1.0,
            _source: { value: "data1" },
          },
        ],
      },
      took: 1,
      timed_out: false,
    };
    queryCache.set("key1", data);
    queryCache.set("key2", data);
    queryCache.delete("key1");
    expect(queryCache.get("key1")).toBeNull();
    expect(queryCache.get("key2")).toEqual(data);
  });

  it("should update default TTL", () => {
    const data: SearchResult<unknown> = {
      hits: {
        total: { value: 1, relation: "eq" },
        max_score: 1.0,
        hits: [
          {
            _index: "test",
            _id: "1",
            _score: 1.0,
            _source: { value: "test-data" },
          },
        ],
      },
      took: 1,
      timed_out: false,
    };
    queryCache.setDefaultTTL(100);
    const key = "ttl-test";
    queryCache.set(key, data);

    expect(queryCache.get(key)).toEqual(data);
    setTimeout(() => {
      expect(queryCache.get(key)).toBeNull();
    }, 150);
  });
});
