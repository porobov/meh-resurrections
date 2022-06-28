const { ethers } = require("hardhat");

// gas report
function reportGas(functionName, gasUsed) {
    const gasPrice = process.env.GAS_PRICE_GWEI !== undefined ? process.env.GAS_PRICE_GWEI : 0
    const usd = process.env.ETH_USD_USD !== undefined ? process.env.ETH_USD_USD : 0
    const gasCostsEth = ethers.utils.formatEther(gasUsed.mul(ethers.utils.parseUnits (gasPrice, "gwei")))
    const gasCostsUsd = gasCostsEth * usd
    console.log("Gas used by %s is %s gas | %s Eth | %s USD | (gas price: %s Gwei, ETHUSD: %s)", functionName, gasUsed, gasCostsEth, gasCostsUsd, gasPrice, usd)
  }

module.exports = { reportGas }
