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
