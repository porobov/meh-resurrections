// emergency pause MEH
// npx hardhat run scripts/pause.js --network mainnet
const { ethers } = require("hardhat")
const { ProjectEnvironment, Deployer } = require("../src/deployer.js")

async function pause() {
    ;[owner] = await ethers.getSigners()
    const exEnv = new ProjectEnvironment(owner)
    const deployer = new Deployer(exEnv, {})
    console.log("Pausing MEH on chain ID:", exEnv.chainID)
    await deployer.initialize()
    await deployer.pauseMeh2016()
    // await deployer.unpauseMeh2016()
    console.log("MEH paused successfully")
}

pause()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });