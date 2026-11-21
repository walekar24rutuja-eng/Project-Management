const test = require('node:test');
const assert = require('node:assert/strict');
const {
  REPORT_MAX_SIZE_BYTES,
  getSafeOriginalName,
  isValidReportStorageName,
  isSupportedReportFile
} = require('../utils/reportFile');

const makePptxBuffer = (entryName) => {
  const fileName = Buffer.from(entryName);
  const localFile = Buffer.alloc(30 + fileName.length);
  localFile.writeUInt32LE(0x04034b50, 0);
  localFile.writeUInt16LE(fileName.length, 26);
  fileName.copy(localFile, 30);

  const centralDirectory = Buffer.alloc(46 + fileName.length);
  centralDirectory.writeUInt32LE(0x02014b50, 0);
  centralDirectory.writeUInt16LE(fileName.length, 28);
  fileName.copy(centralDirectory, 46);

  const endOfCentralDirectory = Buffer.alloc(22);
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0);
  endOfCentralDirectory.writeUInt16LE(1, 8);
  endOfCentralDirectory.writeUInt16LE(1, 10);
  endOfCentralDirectory.writeUInt32LE(centralDirectory.length, 12);
  endOfCentralDirectory.writeUInt32LE(localFile.length, 16);
  return Buffer.concat([localFile, centralDirectory, endOfCentralDirectory]);
};

test('report validation accepts supported file signatures and PowerPoint packages', () => {
  const pptBuffer = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  assert.equal(isSupportedReportFile(Buffer.from('%PDF-1.7'), 'report.pdf'), true);
  assert.equal(isSupportedReportFile(pptBuffer, 'report.ppt'), true);
  assert.equal(
    isSupportedReportFile(makePptxBuffer('ppt/presentation.xml'), 'report.pptx'),
    true
  );
});

test('report validation rejects mismatched, malformed, and unsupported files', () => {
  assert.equal(isSupportedReportFile(Buffer.from('not a PDF'), 'report.pdf'), false);
  assert.equal(
    isSupportedReportFile(makePptxBuffer('word/document.xml'), 'report.pptx'),
    false
  );
  assert.equal(isSupportedReportFile(Buffer.from('%PDF-1.7'), 'report.exe'), false);
  assert.equal(isSupportedReportFile(Buffer.from(''), 'report.pptx'), false);
});

test('report upload size limit and original filenames are constrained', () => {
  assert.equal(REPORT_MAX_SIZE_BYTES, 10 * 1024 * 1024);
  assert.equal(getSafeOriginalName('../../report.pdf'), 'report.pdf');
  assert.equal(getSafeOriginalName('..\\report.pptx'), 'report.pptx');
  assert.equal(getSafeOriginalName(''), 'report');
  assert.equal(isValidReportStorageName('2c55c718-9a4f-4d15-b509-7212bb75c165.pdf'), true);
  assert.equal(isValidReportStorageName('..\\report.pdf'), false);
});
