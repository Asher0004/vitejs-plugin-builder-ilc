import * as fs from 'node:fs';
import prependFile from 'prepend-file';
import { builderCompatibilityIlc } from '../plugin-builder-ilc';

jest.mock('node:fs', () => ({
  readdirSync: jest.fn(),
  realpathSync: jest.fn(),
  openSync: jest.fn(),
  writeSync: jest.fn(),
  rmSync: jest.fn(),
  unlink: jest.fn(),
  promises: {
    mkdir: jest.fn(),
    copyFile: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
    open: jest.fn(),
  },
}));

jest.mock('prepend-file');

describe('builderCompatibilityIlc', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.resetAllMocks();
  });

  test('the plugin should have a name', async () => {
    builderCompatibilityIlc().name;

    expect(builderCompatibilityIlc().name).toBe('plugin-builder-compatibility-ilc');
  });

  test('when another lifecycle is executed, should not call the plugin', async () => {
    process.env.npm_lifecycle_event = 'build:server';
    (fs.readdirSync as any).mockReturnValue([]);

    await builderCompatibilityIlc().closeBundle();

    expect(fs.readdirSync).not.toHaveBeenCalled();
  });

  test('given a valid lifecycle, when executing the plugin and no legacy file found, it must throw error', async () => {
    process.env.npm_lifecycle_event = 'build:client';
    mockSimulationOperationsDisk(['a-file.js', 'another-file.js', 'awesome.js'], false, false);

    await expect(builderCompatibilityIlc().closeBundle()).rejects.toThrow(
      'Wrong inputEntryFile given or did you forgot to use @vitejs/plugin-legacy?',
    );
  });

  test('given a valid lifecycle, when executing the plugin and error occur when renaming file, it should continue processing', async () => {
    process.env.npm_lifecycle_event = 'build:client';
    mockSimulationOperationsDisk(['polyfills-legacy-abc.js', 'client-ilc-legacy-xyz.js', 'awesome.js'], true, false);

    await builderCompatibilityIlc().closeBundle();

    expect(fs.promises.copyFile).toHaveBeenCalled();
    expect(fs.promises.unlink).toHaveBeenCalled();
  });

  test('given a valid lifecycle, when executing the plugin and fatal error occur when renaming file, it must throw error', async () => {
    process.env.npm_lifecycle_event = 'build:client';
    mockSimulationOperationsDisk(['polyfills-legacy-abc.js', 'client-ilc-legacy-xyz.js', 'awesome.js'], true, true);

    await expect(builderCompatibilityIlc().closeBundle()).rejects.toThrow('Fatal error while moving files. Please check config');
  });

  test('given a valid lifecycle, when executing the plugin, should manipulate files and folders adequately', async () => {
    process.env.npm_lifecycle_event = 'build:client';
    mockSimulationOperationsDisk(['polyfills-legacy-abc.js', 'client-ilc-legacy-xyz.js', 'awesome.js'], false, false);

    await builderCompatibilityIlc().closeBundle();

    expect(fs.readdirSync).toHaveBeenCalledWith('./build/client/assets');
    expect(fs.promises.rename).toHaveBeenCalledWith(
      './build/client/assets/client-ilc-legacy-xyz.js',
      './build/client/assets/main.xyz.js',
    );
    expect(fs.promises.copyFile).not.toHaveBeenCalled();
    expect(prependFile).toHaveBeenCalledWith(
      './build/client/assets/main.xyz.js',
      '!function(b) { const a = document.currentScript.src;',
    );
    expect(fs.writeSync).toHaveBeenCalledWith(1, '}(window.ILC && window.ILC.define || window.define)', 43);
    expect(fs.writeSync).toHaveBeenCalledWith(1, '{"assets":{"main":{"js":["/main.xyz.js"]}}}');

    expect(fs.promises.unlink).toHaveBeenCalledWith('./build/client/assets/polyfills-legacy-abc.js');
    expect(fs.rmSync).toHaveBeenCalledWith('./build/client/.vite', { recursive: true, force: true });
  });

  test('given a valid lifecycle, when executing the plugin with custom config, should manipulate files and folders adequately', async () => {
    process.env.npm_lifecycle_event = 'build-frontend';
    mockSimulationOperationsDisk(['polyfills-legacy-abc.js', 'customEntryName-legacy-xyz.js', 'awesome.js'], false, false);

    await builderCompatibilityIlc({
      beginTextBundleFile: 'custom begining',
      endTextBundleFile: 'custom ending',
      generateManifest: false,
      inputEntryFile: 'customEntryName',
      lifecycleEvent: 'build-frontend',
      manifestNameFile: 'my-manifest',
      removePolyfillGeneration: false,
      removeViteFolderGeneration: false,
      outputRootNameDir: './custom-build/partners',
      outputBundleNameDir: 'files',
      outputNameFile: 'bundle',
    }).closeBundle();

    expect(fs.readdirSync).toHaveBeenCalledWith('./custom-build/partners/files');
    expect(fs.promises.rename).toHaveBeenCalledWith(
      './custom-build/partners/files/customEntryName-legacy-xyz.js',
      './custom-build/partners/files/bundle.xyz.js',
    );
    expect(fs.promises.copyFile).not.toHaveBeenCalled();
    expect(prependFile).toHaveBeenCalledWith('./custom-build/partners/files/bundle.xyz.js', 'custom begining');
    expect(fs.writeSync).toHaveBeenCalledWith(1, 'custom ending', 43);

    expect(fs.promises.unlink).not.toHaveBeenCalled();
    expect(fs.rmSync).not.toHaveBeenCalled();
  });
});

function mockSimulationOperationsDisk(fileGenerated: string[], renameFileError: boolean, fatalErrorRenameFileError: boolean) {
  (fs.readdirSync as any).mockReturnValue(fileGenerated);
  (fs.openSync as any).mockReturnValue(1);
  (fs.promises.mkdir as any).mockResolvedValue(true);
  (fs.promises.open as any).mockResolvedValue({ stat: jest.fn().mockResolvedValue({ size: 44 }) });

  if (!renameFileError) {
    (fs.promises.rename as any).mockResolvedValue(true);
  } else {
    if (fatalErrorRenameFileError) {
      (fs.promises.rename as any).mockRejectedValue({ code: 'FATAL' });
    } else {
      (fs.promises.rename as any).mockRejectedValue({ code: 'EXDEV' });
      (fs.promises.copyFile as any).mockResolvedValueOnce(true);
      (fs.promises.unlink as any).mockResolvedValueOnce(true);
    }
  }
}
