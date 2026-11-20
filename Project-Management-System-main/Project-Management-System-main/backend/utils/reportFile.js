const path = require('node:path');

const REPORT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const REPORTS_DIRECTORY = path.resolve(__dirname, '..', 'uploads', 'reports');
const REPORT_STORAGE_NAME_PATTERN = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\.(pdf|ppt|pptx)$/i;
const REPORT_EXTENSIONS = new Set(['.pdf', '.ppt', '.pptx']);
const PDF_SIGNATURE = Buffer.from('%PDF-');
const PPT_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

const hasZipEntry = (buffer, expectedEntry) => {
  const minimumOffset = Math.max(0, buffer.length - 22 - 0xffff);
  let endOfCentralDirectory = -1;

  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      endOfCentralDirectory = offset;
      break;
    }
  }
  if (endOfCentralDirectory < 0) return false;

  const entryCount = buffer.readUInt16LE(endOfCentralDirectory + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(endOfCentralDirectory + 16);
  let cursor = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > endOfCentralDirectory || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      return false;
    }
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const fileNameEnd = cursor + 46 + fileNameLength;
    if (fileNameEnd > endOfCentralDirectory) return false;

    if (buffer.toString('utf8', cursor + 46, fileNameEnd) === expectedEntry) return true;
    cursor = fileNameEnd + extraLength + commentLength;
  }

  return false;
};

const getReportExtension = (fileName) => path.extname(fileName || '').toLowerCase();

const isSupportedReportFile = (buffer, fileName) => {
  const extension = getReportExtension(fileName);
  if (!REPORT_EXTENSIONS.has(extension) || !Buffer.isBuffer(buffer)) return false;

  if (extension === '.pdf') {
    return buffer.length >= PDF_SIGNATURE.length
      && buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE);
  }
  if (extension === '.ppt') {
    return buffer.length >= PPT_SIGNATURE.length
      && buffer.subarray(0, PPT_SIGNATURE.length).equals(PPT_SIGNATURE);
  }
  return buffer.length >= 4
    && buffer.readUInt32LE(0) === 0x04034b50
    && hasZipEntry(buffer, 'ppt/presentation.xml');
};

const getSafeOriginalName = (fileName) => (
  String(fileName || 'report')
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 255) || 'report'
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
