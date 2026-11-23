const path = require('node:path');

const REPORT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const REPORTS_DIRECTORY = path.resolve(__dirname, '..', 'uploads', 'reports');
const REPORT_STORAGE_NAME_PATTERN = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\.pdf$/i;
const REPORT_EXTENSIONS = new Set(['.pdf']);
const PDF_SIGNATURE = Buffer.from('%PDF-');

const getReportExtension = (fileName) => path.extname(fileName || '').toLowerCase();

const isSupportedReportFile = (buffer, fileName) => {
  const extension = getReportExtension(fileName);
  if (!REPORT_EXTENSIONS.has(extension) || !Buffer.isBuffer(buffer)) return false;

  return buffer.length >= PDF_SIGNATURE.length
    && buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE);
};

const getSafeOriginalName = (fileName) => (
  String(fileName || 'report.pdf')
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 255) || 'report.pdf'
);

const isValidReportStorageName = (storageName) => (
  typeof storageName === 'string' && REPORT_STORAGE_NAME_PATTERN.test(storageName)
);

module.exports = {
  REPORT_MAX_SIZE_BYTES,
  REPORTS_DIRECTORY,
  getReportExtension,
  getSafeOriginalName,
  isValidReportStorageName,
  isSupportedReportFile
};
