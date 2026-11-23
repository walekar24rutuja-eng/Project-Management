const test = require('node:test');
const assert = require('node:assert/strict');
const { getCloudinaryConfig } = require('../utils/cloudinaryReportStorage');

test('Cloudinary configuration requires cloud name and API credentials', () => {
  assert.throws(
    () => getCloudinaryConfig({}),
    /CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET/
  );
});

test('Cloudinary configuration reads the cloud name and API credentials', () => {
  assert.deepEqual(getCloudinaryConfig({
    CLOUDINARY_CLOUD_NAME: 'cloud-name',
    CLOUDINARY_API_KEY: 'api-key',
    CLOUDINARY_API_SECRET: 'api-secret'
  }), {
    cloudName: 'cloud-name',
    apiKey: 'api-key',
    apiSecret: 'api-secret'
  });
});
