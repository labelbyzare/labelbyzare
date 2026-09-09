const Catalog = require('./catalog');
const Policy = require('../../js/store-policy');

async function read() {
  try {
    const rows = await Catalog.request('site_settings?key=eq.main&select=value&limit=1', { timeoutMs: 1000 });
    return rows?.[0]?.value || {};
  } catch { return {}; }
}
module.exports = { read, policy: Policy.fromSettings };
