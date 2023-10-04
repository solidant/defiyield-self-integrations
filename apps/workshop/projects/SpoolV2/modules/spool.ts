import type { ModuleDefinitionInterface } from '@defiyield/sandbox';
import {
  Aprs,
  GET_DNFTS_QUERY,
  GET_VAULTS_QUERY,
  GET_VAULT_APRS,
  GQL_HEADERS,
  UserDeposits,
  Vault,
} from '../helpers/gql';
import { FetchPoolsContext, Pool, Token } from '../../../../sandbox/src/types/module';
import SPOOL_ABI from '../abis/SpoolLens.json';
import { ethers, BigNumber } from 'ethers';

const SPOOL_LENS_ADDRESS = '0x8aa6174333F75421903b2B5c70DdF8DA5D84f74F';
const SUBGRAPH_ENDPOINT =
  'https://api.studio.thegraph.com/query/41372/spool-v2_mainnet/version/latest';

export const SpoolModule: ModuleDefinitionInterface = {
  name: 'SpoolModule',
  chain: 'ethereum',
  type: 'pools',

  async preloadTokens(ctx) {
    const allTokens = await ctx.axios({
      url: SUBGRAPH_ENDPOINT,
      method: 'POST',
      headers: GQL_HEADERS,
      data: {
        query: GET_VAULTS_QUERY,
      },
    });
    const tokenIds: string[] = allTokens.data.data.smartVaults.flatMap((smartVault: Vault) =>
      smartVault.assetGroup.assetGroupTokens.map((assetGroupToken) => assetGroupToken.token.id),
    );
    const uniqueTokenIds: string[] = [...new Set(tokenIds.map((item) => item.toLowerCase()))];

    return uniqueTokenIds;
  },

  async fetchPools(ctx) {
    const smartVaultsData = await ctx.axios({
      url: SUBGRAPH_ENDPOINT,
      method: 'POST',
      headers: GQL_HEADERS,
      data: {
        query: GET_VAULTS_QUERY,
      },
    });

    const smartVaults = smartVaultsData.data.data.smartVaults;
    const result = [];

    const response = await ctx.axios({
      url: 'https://graph.spool.fi/graphql',
      method: 'POST',
      headers: GQL_HEADERS,
      data: {
        query: GET_VAULT_APRS,
      },
    });
    const aprs: Aprs = response.data.data;

    for (const vault of smartVaults) {
      const poolValue = [];

      const assetGroupTokens = vault.assetGroup.assetGroupTokens;

      const contract = await new ethers.Contract(SPOOL_LENS_ADDRESS, SPOOL_ABI, ctx.provider);
      const tokenAmounts = await contract.callStatic.getSmartVaultAssetBalances(vault.id, false);

      const foundVault = aprs.smartVaults.find((element) => element.id === vault.id);
      const adjustedApr = foundVault ? Number(foundVault.adjustedApy) : 0;
      for (let j = 0; j < assetGroupTokens.length; j++) {
        const token = assetGroupTokens[j];
        const ctxToken = findTokenById(ctx, token.token.id);
        const tokenAmount = Number(ethers.utils.formatUnits(tokenAmounts[j], token.token.decimals));
        poolValue.push({
          token: ctxToken,
          tvl: tokenAmount * ctxToken.price,
          apr: {
            year: adjustedApr,
          },
        });
      }

      result.push({
        id: vault.name,
        supplied: poolValue,
        extra: {
          apr: adjustedApr,
        },
      });
    }

    return result;
  },

  async fetchUserPositions(ctx) {
    const res = await ctx.axios({
      url: SUBGRAPH_ENDPOINT,
      method: 'POST',
      headers: GQL_HEADERS,
      data: {
        variables: { userId: ctx.user },
        query: GET_DNFTS_QUERY,
      },
    });
    const userDeposits: UserDeposits = res.data.data;

    const contract = await new ethers.Contract(SPOOL_LENS_ADDRESS, SPOOL_ABI, ctx.provider);

    const result = [];
    for (const vault of userDeposits.smartVaults) {
      if (vault.smartVaultDepositNFTs.length === 0) continue;

      const ctxPool: Pool | undefined = ctx.pools.find(
        (pool) => pool.id.toLowerCase() === vault.name.toLowerCase(),
      );
      if (!ctxPool || !ctxPool.supplied) continue;

      const nftIds: Number[] = vault.smartVaultDepositNFTs.map((nft) => parseInt(nft.nftId));
      const [userSvt, vaultSvt, vaultAssets] = await Promise.all([
        contract.callStatic.getUserSVTBalance(vault.id, ctx.user, nftIds),
        contract.callStatic.getSVTTotalSupply(vault.id),
        contract.callStatic.getSmartVaultAssetBalances(vault.id, false),
      ]);

      for (let i = 0; i < vaultAssets.length; i++) {
        const token = vault.assetGroup.assetGroupTokens[i];
        const tokenAmount = Number(
          ethers.utils.formatUnits(vaultAssets[i].mul(userSvt).div(vaultSvt), token.token.decimals),
        );

        result.push({
          id: ctxPool.id,
          supplied: [
            {
              ...ctxPool.supplied[i],
              balance: tokenAmount,
            },
          ],
        });
      }
    }

    return result;
  },
};

function findTokenById(ctx: FetchPoolsContext, id: string): any {
  return ctx.tokens.find((token) => token.address.toLowerCase() === id.toLowerCase());
}
