const test = require('node:test');
const assert = require('node:assert/strict');
const { getR2Config } = require('../utils/r2ReportStorage');

test('R2 configuration requires a bucket-scoped S3 credential set', () => {
  assert.throws(
    () => getR2Config({}),
    /R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY/
  );
});

test('R2 configuration reads the account, bucket, and access credentials', () => {
  assert.deepEqual(getR2Config({
    R2_ACCOUNT_ID: 'account-id',
    R2_BUCKET_NAME: 'project-reports',
    R2_ACCESS_KEY_ID: 'access-key',
    R2_SECRET_ACCESS_KEY: 'secret-key'
  }), {
    accountId: 'account-id',
    bucketName: 'project-reports',
    accessKeyId: 'access-key',
    secretAccessKey: 'secret-key'
  });
});
