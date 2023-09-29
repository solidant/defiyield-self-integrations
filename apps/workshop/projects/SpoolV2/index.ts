import type { ProjectDefinitionInterface } from '@defiyield/sandbox';
import { SpoolModule } from './modules/spool';

const project: ProjectDefinitionInterface = {
  name: 'SpoolV2',
  categories: ['Yield Aggregator'],
  links: {
    logo: 'https://icons.de.fi/spool-dao-token/coingecko.webp',
    url: 'https://mainnet-v2.spool.fi/',
    discord: 'https://discord.com/invite/kCDC7BWxrw',
    telegram: 'https://t.me/SpoolFi',
    twitter: 'https://twitter.com/spoolfi',
  },
  modules: [SpoolModule],
};

export default project;
