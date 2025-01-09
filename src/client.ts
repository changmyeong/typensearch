import { Client, ClientOptions } from "@opensearch-project/opensearch";
import { Model } from "./model";
import { indexMetadataMap } from "./decorator";
import { convertOptionsToMappingProperties } from "./util";

export let opensearchClient: Client;

export const setOpenSearchClient = (options: ClientOptions) => {
  opensearchClient = new Client(options);
};

export const initialize = async (
  opensearchClientOptions: ClientOptions,
  typensearchOptions?: {
    createIndexesIfNotExists?: Model[];
  }
): Promise<void> => {
  opensearchClient = new Client(opensearchClientOptions);

  if (!typensearchOptions?.createIndexesIfNotExists) {
    return;
  }

  for (const Model of typensearchOptions?.createIndexesIfNotExists) {
    const metadata = indexMetadataMap.get(Model.constructor);
    const mappingProperties: any = {};
    const { id, ...propertiesWithoutId } = metadata.properties;

    for (const [propertyName, values] of Object.entries(propertiesWithoutId)) {
      const { type, options } = values;
      mappingProperties[propertyName] = {
        type,
        ...convertOptionsToMappingProperties(options),
      };
    }

    await opensearchClient.indices
      .get({ index: metadata.name })
      .catch((error) => {
        if (error?.meta?.body?.error?.type === "index_not_found_exception") {
          opensearchClient.indices.create({
            index: metadata.name,
            body: {
              settings: {
                index: {
                  number_of_shards: metadata.numberOfShards,
                  number_of_replicas: metadata.numberOfReplicas,
                },
              },
              mappings: {
                properties: mappingProperties,
              },
            },
          });
        } else {
          throw error;
        }
      });
  }
};
