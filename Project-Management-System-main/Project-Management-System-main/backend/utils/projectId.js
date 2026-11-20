const { randomBytes } = require('crypto');

const createProjectId = () => `PRJ-${randomBytes(10).toString('hex').toUpperCase()}`;

module.exports = createProjectId;
