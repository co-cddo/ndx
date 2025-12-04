/**
 * Jest setup file
 * Runs before any tests to configure the test environment
 */

// Skip secrets pre-warming during tests
// This prevents the secrets module from trying to call AWS Secrets Manager
// at module load time, which would fail before mocks are set up
process.env.SKIP_SECRETS_PREWARM = "true"
