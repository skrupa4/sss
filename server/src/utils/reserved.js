const config = require('../config');

const isReservedName = (name) => config.adminNames.includes(String(name || '').trim().toLowerCase());

module.exports = { isReservedName };
