// npx hardhat run scripts/estimateGas.js --network hardhat
// this is also a playground for various tests
const { getConfigNumConfirmations, getImpersonatedSigner  } = require("../src/tools.js")
const conf = require('../conf.js')
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const { ethers } = require("hardhat")

async function gas() {

  // gas price
  const feeData = await ethers.provider.getFeeData()
  const gasPrice = feeData.gasPrice;
  const gasPriceInGwei = ethers.formatUnits(gasPrice, 'gwei');
  console.log("gasPriceInGwei:", gasPriceInGwei)
  
  // estimate gas for transaction
  const mehAdmin = await getImpersonatedSigner(conf.mehAdminAddress)
  meh2016 = new ethers.Contract(conf.oldMehAddress, conf.oldMehAbi, mehAdmin)
  const txGas = await meh2016.adminContractSecurity.estimateGas(ZERO_ADDRESS, false, false, false)
  const totalGas = txGas * gasPrice
  console.log("totalGas:", totalGas)

  const tx = await meh2016.adminContractSecurity(ZERO_ADDRESS, false, false, false)
  console.log("Unpausing meh. Tx:", tx?.hash)
  const receipt = await tx.wait(getConfigNumConfirmations())
  const gotReceipt = receipt ? true : false;
  (gotReceipt) ? console.log("MEH unpaused...") : null;
}

gas()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });