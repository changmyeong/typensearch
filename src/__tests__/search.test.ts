import { OpenSearchIndex, Field, Model } from "../index";
import { FieldType, QueryBuilder, SearchResult } from "../types";
import { Client } from "@opensearch-project/opensearch";
import { opensearchClient } from "../client";

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
  };

  return {
    opensearchClient: mockClient,
  };
});

describe("Extended Search Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Geospatial Query Tests", () => {
    @OpenSearchIndex({ name: "test-locations" })
    class LocationModel extends Model {
      @Field({ type: "text" as FieldType })
      name: string;

      @Field({ type: "geo_point" as FieldType })
      location: {
        lat: number;
        lon: number;
      };
    }

    it("should perform geo distance query", async () => {
      const results = await LocationModel.query()
        .geoDistance("location", {
          distance: "10km",
          lat: 37.7749,
          lon: -122.4194,
        })
        .execute();

      expect(opensearchClient.search).toHaveBeenCalledWith({
        index: "test-locations",
        body: expect.objectContaining({
          query: {
            geo_distance: {
              distance: "10km",
              location: {
                lat: 37.7749,
                lon: -122.4194,
              },
            },
          },
        }),
      });
      expect(results).toBeDefined();
    });

    it("should perform geo bounding box query", async () => {
      const results = await LocationModel.query()
        .geoBoundingBox("location", {
          top_left: { lat: 38.0, lon: -123.0 },
          bottom_right: { lat: 37.0, lon: -122.0 },
        })
        .execute();

      expect(opensearchClient.search).toHaveBeenCalledWith({
        index: "test-locations",
        body: expect.objectContaining({
          query: {
            geo_bounding_box: {
              location: {
                top_left: { lat: 38.0, lon: -123.0 },
                bottom_right: { lat: 37.0, lon: -122.0 },
              },
            },
          },
        }),
      });
      expect(results).toBeDefined();
    });
  });

  describe("Subquery Tests", () => {
    @OpenSearchIndex({ name: "test-departments" })
    class DepartmentModel extends Model {
      @Field({ type: "keyword" as FieldType })
      name: string;

      @Field({
        type: "join" as FieldType,
        relations: { department: ["employee"] },
      })
      relation: string;
    }

    @OpenSearchIndex({ name: "test-employees" })
    class EmployeeModel extends Model {
      @Field({ type: "text" as FieldType })
      name: string;

      @Field({ type: "keyword" as FieldType })
      departmentId: string;

      @Field({
        type: "join" as FieldType,
        relations: { department: ["employee"] },
      })
      relation: string;
    }

    it("should perform has_parent query", async () => {
      const results = await EmployeeModel.query()
        .hasParent<DepartmentModel>("department", (q) =>
          q.match("name", "Engineering")
        )
        .execute();

      expect(opensearchClient.search).toHaveBeenCalledWith({
        index: "test-employees",
        body: {
          query: {
            has_parent: {
              parent_type: "department",
              query: {
                match: {
                  name: {
                    query: "Engineering",
                  },
                },
              },
            },
          },
        },
      });
      expect(results).toBeDefined();
    });

    it("should perform has_child query", async () => {
      const results = await DepartmentModel.query()
        .hasChild<EmployeeModel>("employee", (q) => q.match("name", "John"))
        .execute();

      expect(opensearchClient.search).toHaveBeenCalledWith({
        index: "test-departments",
        body: {
          query: {
            has_child: {
              type: "employee",
              query: {
                match: {
                  name: {
                    query: "John",
                  },
                },
              },
            },
          },
        },
      });
      expect(results).toBeDefined();
    });
  });

  describe("Advanced Aggregation Tests", () => {
    @OpenSearchIndex({ name: "test-sales" })
    class SalesModel extends Model {
      @Field({ type: "keyword" as FieldType })
      product: string;

      @Field({ type: "double" as FieldType })
      amount: number;

      @Field({ type: "integer" as FieldType })
      quantity: number;

      @Field({ type: "date" as FieldType })
      date: Date;
    }

    it("should perform pipeline aggregations", async () => {
      const results = await SalesModel.query()
        .aggs("monthly_sales", (a) =>
          a
            .dateHistogram("date", { calendar_interval: "month" })
            .subAggs("total_sales", (sa) => sa.sum("amount"))
        )
        .aggs("sales_stats", (a) => a.extendedStats("amount"))
        .execute();

      expect(opensearchClient.search).toHaveBeenCalledWith({
        index: "test-sales",
        body: expect.objectContaining({
          aggs: {
            monthly_sales: {
              date_histogram: {
                field: "date",
                calendar_interval: "month",
              },
              aggs: {
                total_sales: {
                  sum: { field: "amount" },
                },
              },
            },
            sales_stats: {
              extended_stats: { field: "amount" },
            },
          },
        }),
      });
      expect(results.aggregations).toBeDefined();
    });

    it("should perform matrix aggregations", async () => {
      const results = await SalesModel.query()
        .aggs("product_correlations", (a) =>
          a.matrixStats().fields(["amount", "quantity"])
        )
        .execute();

      expect(opensearchClient.search).toHaveBeenCalledWith({
        index: "test-sales",
        body: expect.objectContaining({
          aggs: {
            product_correlations: {
              matrix_stats: {
                fields: ["amount", "quantity"],
              },
            },
          },
        }),
      });
      expect(results.aggregations).toBeDefined();
    });
  });
});
