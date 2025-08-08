const { getFormattedBalance } = require('../src/tools.js');
const { getDeployer } = require('../src/deployer.js');

// balances and addresses for mehAdmin and operator (see if they are the same)
async function main() {
  try {
    const deployer = await getDeployer();
    await deployer.initialize();
    
    const operatorAddress = deployer.exEnv.operatorWallet.address;
    const mehAdminAddress = deployer.exEnv.mehAdminAddress;
    const operatorBalance = await getFormattedBalance(operatorAddress);
    const mehAdminBalance = await getFormattedBalance(mehAdminAddress);
    
    console.log(`Operator address: ${operatorAddress}`);
    console.log(`Operator ETH balance: ${operatorBalance} ETH`);
    console.log(`meh Admin address: ${mehAdminAddress}`);
    console.log(`meh Admin ETH balance: ${mehAdminBalance} ETH`);
    
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();
