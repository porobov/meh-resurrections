const { ethers, network } = require("hardhat");

// returns impersonated signer for local hardfork
async function getImpersonatedSigner(addr) {
  await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [addr],
    });
  // topup balance
  // await network.provider.send("hardhat_setBalance", [
  //     addr,
  //     "0x100000",
  // ]);

  return ethers.getSigner(addr)
}

// open zeppelin's time doesn't work for some reason (maybe me, maybe hardfork)
async function increaseTimeBy(seconds) {
  await network.provider.send("evm_increaseTime", [seconds])
  await network.provider.send("evm_mine") // this one will have 02:00 PM as its timestamp
}

//await ethers.getDefaultProvider().getBalance(address) - will always querry chain data
async function getFormattedBalance(address) {
  return ethers.utils.formatEther(await network.provider.send("eth_getBalance", [address]))
}

// return network name specified in hardhat.config.js
function getConfigNetworkName() {
    return network.name
}

// return ChainID specified in hardhat.config.js
function getConfigChainID() {
  return network.config.chainId
}

function getConfigNumConfirmations(){
  return network.config.numConfirmations
}

class GasReporter {

  constructor() {
    this.report = ''
  }

  addGasRecord(functionName, gasUsed) {
    const gasPrice = process.env.GAS_PRICE_GWEI !== undefined ? process.env.GAS_PRICE_GWEI : 0
    const usd = process.env.ETH_USD_USD !== undefined ? process.env.ETH_USD_USD : 0
    const gasCostsEth = ethers.utils.formatEther(gasUsed.mul(ethers.utils.parseUnits (gasPrice, "gwei")))
    const gasCostsUsd = gasCostsEth * usd
    this.report += 
    `Gas used by ${functionName} is ${gasUsed} gas | ${gasCostsEth} Eth | ${gasCostsUsd} USD | (gas price: ${gasPrice} Gwei, ETHUSD: ${usd}) \n`
  }

  reportToConsole() {
    console.log(this.report)
  }
}

module.exports = { 
  GasReporter, 
  increaseTimeBy, 
  getFormattedBalance,
  getConfigChainID,
  getConfigNumConfirmations,
  getImpersonatedSigner
}
