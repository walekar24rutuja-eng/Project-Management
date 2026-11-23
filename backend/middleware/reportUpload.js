const multer = require('multer');
const { REPORT_MAX_SIZE_BYTES, getReportExtension } = require('../utils/reportFile');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: REPORT_MAX_SIZE_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    const extension = getReportExtension(file.originalname);
    if (extension !== '.pdf') {
      callback(new Error('Only PDF files are allowed'));
      return;
    }
    callback(null, true);
  }
});

const uploadReport = (req, res, next) => {
  upload.single('report')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ message: 'Report files must be 10 MB or smaller' });
      return;
    }

    res.status(400).json({ message: error.message || 'Could not process the uploaded report' });
  });
};

module.exports = uploadReport;
