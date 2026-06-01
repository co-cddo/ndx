module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/lib"],
  testMatch: ["**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  moduleNameMapper: {
    "^@ndx/signup-types$": "<rootDir>/../src/signup/types.ts",
    "^@ndx/signup-types/blocklist-data$": "<rootDir>/../src/signup/blocklist-data.ts",
  },
}
