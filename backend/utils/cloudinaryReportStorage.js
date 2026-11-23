const { Readable } = require('node:stream');
const cloudinary = require('cloudinary').v2;

const getCloudinaryConfig = (env = process.env) => {
  const requiredNames = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];
  const missingNames = requiredNames.filter((name) => !env[name]?.trim());
  if (missingNames.length > 0) {
    throw new Error(`Cloudinary report storage is not configured. Set ${missingNames.join(', ')}`);
  }

  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME.trim(),
    apiKey: env.CLOUDINARY_API_KEY.trim(),
    apiSecret: env.CLOUDINARY_API_SECRET.trim()
  };
};

let configuredSignature;

const getCloudinaryClient = () => {
  const config = getCloudinaryConfig();
  const signature = [config.cloudName, config.apiKey, config.apiSecret].join('\0');

  if (signature !== configuredSignature) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
      secure: true
    });
    configuredSignature = signature;
  }

  return cloudinary;
};

const putReportObject = async (key, body, contentType) => {
  const client = getCloudinaryClient();
  await new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        public_id: key,
        resource_type: 'raw',
        type: 'authenticated',
        overwrite: false
      },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    Readable.from(body).pipe(uploadStream);
  });
  void contentType;
};

const getReportObject = async (key) => {
  const client = getCloudinaryClient();
  const signedUrl = client.url(key, {
    resource_type: 'raw',
    type: 'authenticated',
    sign_url: true
  });

  const response = await fetch(signedUrl);
  if (!response.ok || !response.body) {
    const error = new Error(`Cloudinary report download failed with status ${response.status}`);
    error.name = response.status === 404 ? 'NoSuchKey' : 'CloudinaryError';
    throw error;
  }

  return { Body: Readable.fromWeb(response.body) };
};

const deleteReportObject = async (key) => {
  const client = getCloudinaryClient();
  await client.uploader.destroy(key, { resource_type: 'raw', type: 'authenticated' });
};

module.exports = {
  deleteReportObject,
  getCloudinaryConfig,
  getReportObject,
  putReportObject
};
