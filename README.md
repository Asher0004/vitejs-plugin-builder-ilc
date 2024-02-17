# vitejs-plugin-builder-ilc

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) ![Static Badge](https://img.shields.io/badge/Coverage-100%25-green)

## Description

Why another plugin...<br>
For ViteJS, an util plugin builder for MFEs compatibility with ILC namecheap.

### Acknowledge

This plugin target only frontend build.<br>It aim to complete the compilation of SystemJS files.<br>This plugin won't support server files bundle.<br>**Tested compatibility react-ts only**

Since this bundler is agnostic of the framework frontend used, _in theory_ this plugin should support all template that ViteJS [promote](https://vitejs.dev/guide/#trying-vite-online).

## Usage

For this plugin to work, you ***must*** use another plugin that will compile your bundle to SystemJS.<br>You can use the official ViteJS [@vitejs/plugin-legacy](https://www.npmjs.com/package/@vitejs/plugin-legacy).


The plugin options are completely customisable as your wish. The default values are : 
```typescript
lifecycleEvent: 'build:client', // Command in package.json to build frontend bundle
inputEntryFile: 'client-ilc',
generateManifest: true,
removePolyfillGeneration: true,
removeViteFolderGeneration: true,
manifestNameFile: 'ssr-manifest',
outputRootNameDir: './build/client',
outputBundleNameDir: 'assets',
outputNameFile: 'main',
beginTextBundleFile: '!function(b) { const a = document.currentScript.src;',
endTextBundleFile: '}(window.ILC && window.ILC.define || window.define)',
```

To modify options simply pass them in parameter:<br>`builderCompatibilityIlc({"generateManifest":false,"outputNameFile":"bundle"})`

An example of using the plugin:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { builderCompatibilityIlc } from 'vitejs-plugin-builder-ilc';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11'],
      polyfills: false,
      renderModernChunks: false,
    }),
    builderCompatibilityIlc(),
  ],
  appType: 'custom',
  build: {
    rollupOptions: {
      preserveEntrySignatures: 'allow-extension', // IMPORTANT
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
      input: 'src/client-ilc.tsx', // IMPORTANT
    },
  },
});
```
