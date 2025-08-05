// npx hardhat run scripts/setDelay.js --network <network>

const { ethers } = require("hardhat");
const { getConfigChainID } = require("../src/tools.js");
const { ProjectEnvironment } = require("../src/deployer.js");

async function main() {
    let operatorWallet;
    if (getConfigChainID() === 1) {
        console.log("For sepolia only. Quitting...")
        process.exit(0);
    } else {
        [operatorWallet] = await ethers.getSigners();
    }

    const exEnv = new ProjectEnvironment(operatorWallet)
    await exEnv.initEnv()

    // Set parameters
    const newDelay = 1;
    const charityAddress = "0x0000000000000000000000000000000000000000"; // or set to a real address
    const newImagePlacementPriceInWei = 0;

    // Call the contract function
    const tx = await exEnv.meh2016.adminContractSettings(newDelay, charityAddress, newImagePlacementPriceInWei);
    console.log("Sent tx:", tx.hash);
    await tx.wait();

    // check if delay is set
    const state = await exEnv.meh2016.getStateInfo();
    console.log("Delay:", state[6]);
    console.log("Delay set successfully.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
