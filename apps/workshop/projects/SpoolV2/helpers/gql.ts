export interface Vaults {
  smartVaults: Vaults[];
}

export interface Vault {
  id: string;
  name: string;
  assetGroup: {
    assetGroupTokens: {
      token: {
        id: string;
        name: string;
        decimals: number;
      };
    }[];
  };
}

export interface UserDeposits {
  smartVaults: {
    id: string;
    name: string;
    smartVaultDepositNFTs: {
      nftId: string;
      owner: {
        id: string;
      };
      shares: string;
    }[];
    assetGroup: {
      assetGroupTokens: {
        token: {
          id: string;
          name: string;
          decimals: number;
        };
      }[];
    };
  }[];
}

export interface Aprs {
  smartVaults: {
    id: string;
    adjustedApy: string;
    baseApy: string;
  }[];
}

export const GQL_HEADERS = {
  'Content-Type': 'application/json',
};

export const GET_VAULTS_QUERY = `
  query GetVaults {
    smartVaults {
      id
      name
      assetGroup {
        assetGroupTokens {
          token {
            id
            name
            decimals
          }
        }
      }
    }
  }
`;

export const GET_DNFTS_QUERY = `
  query getUserVaultNft($userId: String!) {
    smartVaults {
      id
      name
      smartVaultDepositNFTs(where: {owner_: {id: $userId}, shares_gt: "0"}) {
        nftId
        owner {
          id
        }
        shares
      }
      assetGroup {
        assetGroupTokens {
          token {
            id
            name
            decimals
          }
        }
      }
    }
  }
`;

export const GET_VAULT_APRS = `query{
  smartVaults
  {
    id
    adjustedApy
    baseApy
  }
}`;
