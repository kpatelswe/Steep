// Tests that import app modules need a valid config. Point at the local docker DB
// unless the environment already says otherwise.
process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "postgres://steep:steep@localhost:5433/steep";
process.env.JWT_SECRET ??= "test-secret-test-secret-test-secret";
process.env.CRON_SECRET ??= "cron-secret-cron-secret-cron-secret";
process.env.APP_URL ??= "http://localhost:3000";
