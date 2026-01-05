module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test", "<rootDir>/lib"],
  testMatch: ["**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    // Map .js imports to .ts files for shared config module
    "^(\\.\\./)+shared/config/environment\\.js$": "<rootDir>/../shared/config/environment.ts",
  },
}
