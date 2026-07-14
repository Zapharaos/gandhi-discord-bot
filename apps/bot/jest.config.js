/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    // Resolve the TS path aliases (mirrors tsconfig "paths"), plus the shared
    // @gandhi/core package which we map straight to its TypeScript source so tests
    // don't require the package to be pre-built.
    moduleNameMapper: {
        '^@gandhi/core$': '<rootDir>/../../packages/core/src/index.ts',
        '^@gandhi/core/(.*)$': '<rootDir>/../../packages/core/src/$1',
        '^@commands/(.*)$': '<rootDir>/src/commands/$1',
        '^@constants/(.*)$': '<rootDir>/src/constants/$1',
        '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
        '^@events/(.*)$': '<rootDir>/src/events/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@models/(.*)$': '<rootDir>/src/models/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
    },
    transform: {
        // tests/tsconfig.json sets isolatedModules (transpile-only): type-checking is
        // handled by the build step, which keeps cross-package (@gandhi/core) type
        // resolution out of the test runner.
        '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tests/tsconfig.json' }],
    },
    // Only instrument the pure business-logic layers that these unit tests exercise.
    // The time/number/database helpers and DB models now live in @gandhi/core.
    collectCoverageFrom: [
        '<rootDir>/src/utils/**/*.ts',
        '<rootDir>/src/models/**/*.ts',
        '<rootDir>/../../packages/core/src/utils/**/*.ts',
        '<rootDir>/../../packages/core/src/models/**/*.ts',
    ],
    coverageReporters: ['text', 'lcov'],
};
