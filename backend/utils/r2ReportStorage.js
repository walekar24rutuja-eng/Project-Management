const {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} = require('@aws-sdk/client-s3');

const getR2Config = (env = process.env) => {
  const requiredNames = [
    'R2_ACCOUNT_ID',
    'R2_BUCKET_NAME',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY'
  ];
  const missingNames = requiredNames.filter((name) => !env[name]?.trim());
  if (missingNames.length > 0) {
    throw new Error(`R2 report storage is not configured. Set ${missingNames.join(', ')}`);
  }

  return {
    accountId: env.R2_ACCOUNT_ID.trim(),
    bucketName: env.R2_BUCKET_NAME.trim(),
    accessKeyId: env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: env.R2_SECRET_ACCESS_KEY.trim()
  };
};

let client;
let clientSignature;

const getR2Client = () => {
  const config = getR2Config();
  const signature = [
    config.accountId,
    config.bucketName,
    config.accessKeyId,
    config.secretAccessKey
  ].join('\0');

  if (!client || signature !== clientSignature) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    });
    clientSignature = signature;
  }

  return { client, bucketName: config.bucketName };
};

const putReportObject = async (key, body, contentType) => {
  const { client: s3, bucketName } = getR2Client();
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: body,
    ContentType: contentType
  }));
};

const getReportObject = async (key) => {
  const { client: s3, bucketName } = getR2Client();
  return s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
};

const deleteReportObject = async (key) => {
  const { client: s3, bucketName } = getR2Client();
  await s3.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
};

module.exports = {
  deleteReportObject,
  getR2Config,
  getReportObject,
  putReportObject
};
