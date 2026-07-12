/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    // Resolve the TS path aliases (mirrors tsconfig "paths").
    moduleNameMapper: {
        '^@commands/(.*)$': '<rootDir>/src/commands/$1',
        '^@constants/(.*)$': '<rootDir>/src/constants/$1',
        '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
        '^@events/(.*)$': '<rootDir>/src/events/$1',
        '^@utils/(.*)$': '<rootDir>/src/utils/$1',
        '^@models/(.*)$': '<rootDir>/src/models/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
    },
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tests/tsconfig.json' }],
    },
    // Only instrument the pure business-logic layer that these unit tests exercise;
    // the controllers/services need a live SQLite (native) binding and are covered separately.
    collectCoverageFrom: [
        'src/utils/**/*.ts',
        'src/models/**/*.ts',
    ],
    coverageReporters: ['text', 'lcov'],
};
