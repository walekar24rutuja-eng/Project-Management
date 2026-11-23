const test = require('node:test');
const assert = require('node:assert/strict');
const {
  REPORT_MAX_SIZE_BYTES,
  getSafeOriginalName,
  isValidReportStorageName,
  isSupportedReportFile
} = require('../utils/reportFile');

test('report validation accepts only PDF file signatures', () => {
  assert.equal(isSupportedReportFile(Buffer.from('%PDF-1.7'), 'report.pdf'), true);
});

test('report validation rejects mismatched, malformed, and unsupported files', () => {
  assert.equal(isSupportedReportFile(Buffer.from('not a PDF'), 'report.pdf'), false);
  assert.equal(isSupportedReportFile(Buffer.from('%PDF-1.7'), 'report.docx'), false);
  assert.equal(isSupportedReportFile(Buffer.from('%PDF-1.7'), 'report.ppt'), false);
  assert.equal(isSupportedReportFile(Buffer.from('%PDF-1.7'), 'report.exe'), false);
  assert.equal(isSupportedReportFile(Buffer.from(''), 'report.pdf'), false);
});

test('report upload size limit and original filenames are constrained', () => {
  assert.equal(REPORT_MAX_SIZE_BYTES, 10 * 1024 * 1024);
  assert.equal(getSafeOriginalName('../../report.pdf'), 'report.pdf');
  assert.equal(getSafeOriginalName(''), 'report.pdf');
  assert.equal(isValidReportStorageName('2c55c718-9a4f-4d15-b509-7212bb75c165.pdf'), true);
  assert.equal(isValidReportStorageName('2c55c718-9a4f-4d15-b509-7212bb75c165.pptx'), false);
  assert.equal(isValidReportStorageName('..\\report.pdf'), false);
});
