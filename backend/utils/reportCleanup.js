const fs = require('node:fs/promises');
const path = require('node:path');
const { deleteReportObject } = require('./cloudinaryReportStorage');
const { REPORTS_DIRECTORY, isValidReportStorageName } = require('./reportFile');

const removeStoredReport = async (reportFile) => {
  if (!reportFile || !isValidReportStorageName(reportFile.storageName)) return;
  try {
    if (reportFile.storageProvider === 'cloudinary') {
      await deleteReportObject(reportFile.storageName);
    } else {
      await fs.unlink(path.join(REPORTS_DIRECTORY, reportFile.storageName));
    }
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Failed to remove a stored report file', error);
  }
};

module.exports = { removeStoredReport };
