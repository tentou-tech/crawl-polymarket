import { ClobClient } from '@polymarket/clob-client';
import { polygon } from 'viem/chains';
import axios, { AxiosInstance } from 'axios';

export class MarketService {
  public client: ClobClient;
  private gammaClient: AxiosInstance;

  constructor() {
    // Basic read-only client doesn't need signer/creds for public endpoints like getMarkets
    this.client = new ClobClient('https://clob.polymarket.com', 137);

    // Gamma API client
    this.gammaClient = axios.create({
      baseURL: 'https://gamma-api.polymarket.com',
      timeout: 10000,
    });
  }

  async getMarkets() {
    try {
      console.log('Fetching markets from Polymarket SDK...');
      // Fetching a simplified view or specific markets usually takes params.
      // getMarkets with no args might fetch a lot or paginated list.
      const response = await this.client.getMarkets();
      // The SDK returns a paginated payload, likely { data: [...] } or an array depending on version.
      // Based on lint error 'PaginationPayload', it returns an object.
      const markets = (response as any).data || [];

      console.log(`Successfully fetched ${markets.length || 0} markets.`);
      if (markets.length > 0) {
        console.log('Sample Market:', markets[0]);
      }
      return markets;
    } catch (error) {
      console.error('Error fetching markets:', error);
      return [];
    }
  }

  async getEventBySlug(slug: string) {
    try {
      console.log(`Fetching event for slug: ${slug}`);
      const response = await this.gammaClient.get(`/events/slug/${slug}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching event for slug ${slug}:`, error);
      return null;
    }
  }

  async getMarketByTokenId(tokenId: string) {
    try {
      // Gamma API supports filtering by clob_token_ids
      const response = await this.gammaClient.get('/markets', {
        params: {
          clob_token_ids: tokenId,
        },
      });
      console.log(
        `Gamma API returned ${
          response.data?.length || 0
        } markets for token ${tokenId}`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching market for token ${tokenId}:`, error);
      return [];
    }
  }
}
