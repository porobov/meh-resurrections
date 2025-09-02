// change NEW_PRICE_IN_ETH to set new price
// npx hardhat run scripts/setNewPrice.js --network mainnet
const { ethers } = require("hardhat")
const { ProjectEnvironment, Deployer } = require("../src/deployer.js")
const chalk = require('chalk')
const { getConfigChainID, getRealMehAdminSigner } = require("../src/tools.js")

const NEW_PRICE_IN_ETH = "0.1"

const newPrice = ethers.parseEther(NEW_PRICE_IN_ETH)
async function setNewPrice() {
  let owner;
  if (getConfigChainID() === 1) {
    owner = await getRealMehAdminSigner();
  } else {
    [owner] = await ethers.getSigners();
  }
  const exEnv = new ProjectEnvironment(owner)
  const deployer = new Deployer(exEnv, {})
  console.log("Setting new price", exEnv.chainID)

  await deployer.initialize()
  await deployer.unpauseMeh2016()
  const tx = await deployer.mehWrapper.adminSetPrice(newPrice)
  await deployer.pauseMeh2016()
  console.log(chalk.gray("Tx:", tx?.hash))
  console.log("New price is set to", NEW_PRICE_IN_ETH)
}

setNewPrice()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });