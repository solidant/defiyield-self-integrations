import type { ModuleDefinitionInterface } from '@defiyield/sandbox';
import { GET_VAULTS_QUERY, GQL_HEADERS, Vault } from '../helpers/gql';
import { FetchPoolsContext } from '../../../../sandbox/src/types/module';
import SPOOL_ABI from '../abis/abi.json';
import * as dotenv from 'dotenv';
import { ethers } from 'ethers';

export const SpoolModule: ModuleDefinitionInterface = {
  name: 'SpoolModule',
  chain: 'ethereum',
  type: 'pools',

  async preloadTokens(ctx) {
    dotenv.config({ path: `${__dirname}\\.env` });
    const allTokens = await ctx.axios({
      url: process.env['DEFIYIELD_GRAPHQL_ENDPOINT'],
      method: 'POST',
      headers: GQL_HEADERS,
      data: {
        query: GET_VAULTS_QUERY,
      },
    });

    const tokenIds: string[] = [];
    allTokens.data.data.smartVaults.forEach((smartVault: Vault) => {
      smartVault.assetGroup.assetGroupTokens.forEach((assetGroupToken) => {
        const tokenId = assetGroupToken.token.id;
        tokenIds.push(tokenId);
      });
    });
    const uniqueTokenIds: string[] = [];
    tokenIds.forEach((item) => {
      if (uniqueTokenIds.indexOf(item) === -1) {
        uniqueTokenIds.push(item.toLowerCase());
      }
    });

    return uniqueTokenIds;
  },

  async fetchPools(ctx) {
    const smartVaultsData = await ctx.axios({
      url: process.env['DEFIYIELD_GRAPHQL_ENDPOINT'],
      method: 'POST',
      headers: GQL_HEADERS,
      data: {
        query: GET_VAULTS_QUERY,
      },
    });

    const smartVaults = smartVaultsData.data.data.smartVaults;
    const result = [];

    for (let i = 0; i < smartVaults.length; i++) {
      const item = smartVaults[i];
      const poolValue = [];

      const assetGroupTokens = item.assetGroup.assetGroupTokens;

      const provider = await new ethers.providers.JsonRpcProvider(process.env['ETHEREUM_URL']);
      const contract = await new ethers.Contract(
        process.env['SPOOL_LENS_ADDRESS']!,
        SPOOL_ABI,
        provider,
      );
      const tokenAmounts = await contract.callStatic.getSmartVaultAssetBalances(item.id, false);

      //TODO: replace above example with the one below
      // const contract2 = new ctx.ethcall.Contract('0x8aa6174333F75421903b2B5c70DdF8DA5D84f74F', SPOOL_ABI);
      // const asdf = await ctx.ethcallProvider.all([
      //   contract.getSmartVaultAssetBalances(item.id, false),
      // ]);

      for (let j = 0; j < assetGroupTokens.length; j++) {
        const token = assetGroupTokens[j];
        const ctxToken = findTokenById(ctx, token.token.id);
        const tokenAmount = Number(
          ethers.utils.formatUnits(tokenAmounts[j], token.token.decimals),
        );
        poolValue.push({
          token: ctxToken,
          tvl: tokenAmount * ctxToken.price,
          apr: {
            year: 0.2,
          },
        });
      }

      result.push({
        id: item.name,
        supplied: poolValue,
      });
    }

    return result;
  },

  /**
   * Returns user positions for all pools
   *
   * @param ctx Context
   * @returns UserPosition[]
   */
  async fetchUserPositions(ctx) {
    // TODO: Fetch User Positions
    return [];
  },
};

function findTokenById(ctx: FetchPoolsContext, id: string): any {
  return ctx.tokens.find((token) => token.address.toLowerCase() === id.toLowerCase());
}
