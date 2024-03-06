// change NEW_PRICE_IN_ETH to set new price
// npx hardhat run scripts/setNewPrice.js --network mainnet
const { ethers } = require("hardhat")
const { ProjectEnvironment, Deployer } = require("../src/deployer.js")
const chalk = require('chalk')

const NEW_PRICE_IN_ETH = "0.001"

const newPrice = ethers.parseEther(NEW_PRICE_IN_ETH)
async function pause() {
    ;[owner] = await ethers.getSigners()
    const exEnv = new ProjectEnvironment(owner)
    const deployer = new Deployer(exEnv, {})
    console.log("Setting new price", exEnv.chainID)
    if (exEnv.chainID == 5) {
      await deployer.initialize()
      const tx = await deployer.mehWrapper.adminSetPrice(newPrice)
      console.log(chalk.gray("Tx:", tx?.hash))
      console.log("New price is set to", NEW_PRICE_IN_ETH)
    } else {
      console.log(chalk.red("Can only set new price for testnet. Modify script for mainnet"))
    }
}

pause()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });