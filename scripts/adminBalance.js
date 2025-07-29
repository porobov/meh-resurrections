const { getRealMehAdminSigner, getFormattedBalance } = require('../src/tools.js');

async function main() {
  try {
    const admin = await getRealMehAdminSigner();
    const address = admin.address;
    const balance = await getFormattedBalance(address);
    console.log(`Admin address: ${address}`);
    console.log(`ETH balance: ${balance}`);
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();
