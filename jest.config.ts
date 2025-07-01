import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    globalSetup: './jest.setup.ts',
    testEnvironment: 'node',
    maxWorkers: 1,
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
};

export default config;
