import fs from 'node:fs';
import path from 'node:path';
import prependFile from 'prepend-file';

export type ErrorNode = {
  code: string;
};

export type Options = {
  lifecycleEvent?: string;
  inputEntryFile?: string;
  generateManifest?: boolean;
  removePolyfillGeneration?: boolean;
  removeViteFolderGeneration?: boolean;
  manifestNameFile?: string;
  outputRootNameDir?: string;
  outputBundleNameDir?: string;
  outputNameFile?: string;
  beginTextBundleFile?: string;
  endTextBundleFile?: string;
};

const DEFAULT_OPTIONS = {
  lifecycleEvent: 'build:client',
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
};

export const builderCompatibilityIlc = (options?: Options) => {
  const option = { ...DEFAULT_OPTIONS, ...options };
  const clientIlcLegacy = `${option.inputEntryFile}-legacy-`;

  return {
    name: 'plugin-builder-compatibility-ilc',
    closeBundle: async () => {
      if (process.env.npm_lifecycle_event === option.lifecycleEvent) {
        const folderPath = `${option.outputRootNameDir}/${option.outputBundleNameDir}`;
        const files = fs.readdirSync(folderPath);
        const file = files.filter((x: string) => x.startsWith(clientIlcLegacy))[0];

        if (!file) {
          throw new Error('Wrong inputEntryFile given or did you forgot to use @vitejs/plugin-legacy?');
        }

        const sourcePath = `${folderPath}/${file}`;
        const destinationPath = `${folderPath}/${option.outputNameFile}.${file.split(clientIlcLegacy)[1]}`;

        // CREDITS TO https://github.com/sindresorhus/move-file
        await fs.promises.mkdir(path.dirname(destinationPath), {
          recursive: true,
          mode: 0o777, // read, write, & execute for owner, group and others
        });

        try {
          await fs.promises.rename(sourcePath, destinationPath);
        } catch (error) {
          if ((error as ErrorNode).code === 'EXDEV') {
            await fs.promises.copyFile(sourcePath, destinationPath);
            await fs.promises.unlink(sourcePath);
          } else {
            throw new Error('Fatal error while moving files. Please check config');
          }
        }
        // End CREDITS

        await prependFile(destinationPath, option.beginTextBundleFile);

        const bundleFile = fs.openSync(destinationPath, 'r+');
        const handle = await fs.promises.open(destinationPath);
        const { size } = await handle.stat();
        fs.writeSync(bundleFile, option.endTextBundleFile, size - 1);

        if (option.generateManifest) {
          const rootBuild = option.outputRootNameDir.split('/');
          rootBuild.pop();

          const manifestFile = fs.openSync(`${rootBuild.join('/')}/${option.manifestNameFile}.json`, 'w+');

          fs.writeSync(
            manifestFile,
            `{"${option.outputBundleNameDir}":{"${option.outputNameFile}":{"js":["/${option.outputNameFile}.${
              file.split(clientIlcLegacy)[1]
            }"]}}}`,
          );
        }

        if (option.removePolyfillGeneration) {
          const polyfill = files.filter((x: string) => x.startsWith('polyfills-legacy'))[0];
          fs.promises.unlink(folderPath + '/' + polyfill);
        }

        if (option.removeViteFolderGeneration) {
          fs.rmSync(`${option.outputRootNameDir}/.vite`, { recursive: true, force: true });
        }
      }
    },
  };
};
