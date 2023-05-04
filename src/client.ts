import { Client, ClientOptions } from '@opensearch-project/opensearch';

export let opensearchClient: Client;

export const setOpenSearchClient = (options: ClientOptions) => {
  opensearchClient = new Client(options);
}