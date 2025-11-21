module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', 'cookie-router.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
