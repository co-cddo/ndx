module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test", "<rootDir>/lib"],
  testMatch: ["**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    ".+/@co-cddo/isb-client/.+\\.js$": ["ts-jest", { useESM: false }],
  },
  moduleNameMapper: {
    "^@co-cddo/isb-client$": "<rootDir>/node_modules/@co-cddo/isb-client/dist/index.js",
  },
  transformIgnorePatterns: ["/node_modules/(?!@co-cddo/isb-client)"],
  setupFiles: ["<rootDir>/jest.setup.js"],
}
