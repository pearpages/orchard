import { defineConfig } from 'astro/config';

// Deployed path-based under one domain: https://orchard.pearpages.com/focaccia/
export default defineConfig({
  site: 'https://orchard.pearpages.com',
  base: '/focaccia',
});
