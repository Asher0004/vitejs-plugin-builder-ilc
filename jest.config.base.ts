export const preset = 'ts-jest';
export const testEnvironment = 'node';
export const testMatch = ['**/__tests__/**/?(*.)+(spec|test).[jt]s?(x)'];
export const modulePathIgnorePatterns = ['dist'];
export const coverageThreshold = {
  global: {
    branches: 100,
    functions: 100,
    lines: 100,
    statements: 100,
  },
};
export const collectCoverageFrom = [
  '**/*.ts',
  '!**/src/index.ts',
  '!**/src/app.ts',
  '!**/dist/**/*.js',
  '!**/dist/**/*.d.ts',
  '!**/*.it.test.ts',
  '!jest.config.base.ts',
  '!jest.config.ts',
];
