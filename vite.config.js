import { defineConfig } from 'vite';
import { renderBody, renderHead } from './src/ui/templates.js';

// Prerenders the menu, prices, hours and every bilingual string into index.html from
// src/data/*.js, so the content is real HTML for search engines, screen readers and no-JS visitors.
const prerender = () => ({
  name: 'ndole-prerender',
  transformIndexHtml: {
    order: 'pre',
    handler: (html) => html.replace('<!--head-->', renderHead()).replace('<!--body-->', renderBody()),
  },
});

export default defineConfig({
  // "/" locally and on Vercel; the GitHub Pages workflow sets BASE_PATH=/restaubuea/.
  base: process.env.BASE_PATH || '/',
  plugins: [prerender()],
  build: {
    target: 'es2020',
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 700,
  },
});
