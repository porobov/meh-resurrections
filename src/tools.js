const { ethers, network } = require("hardhat");

// returns impersonated signer for local hardfork
// if "ProviderError: unknown account..." see below
// https://github.com/NomicFoundation/hardhat/issues/1226 
async function getImpersonatedSigner(addr) {
  // old solution
  // await hre.network.provider.request({
  //     method: "hardhat_impersonateAccount",
  //     params: [addr],
  //   });
  // return ethers.getSigner(addr)
  return ethers.getImpersonatedSigner(addr);
}

// open zeppelin's time doesn't work for some reason (maybe me, maybe hardfork)
async function increaseTimeBy(seconds) {
  await network.provider.send("evm_increaseTime", [seconds])
  await network.provider.send("evm_mine") // this one will have 02:00 PM as its timestamp
}

//await ethers.getDefaultProvider().getBalance(address) - will always querry chain data
async function getFormattedBalance(address) {
  return ethers.utils.formatEther(await getBalance(address))
}

async function getBalance(address) {
  return await network.provider.send("eth_getBalance", [address])
}

// return network name specified in hardhat.config.js
function getConfigNetworkName() {
    return network.name
}

// TODO
// This dosn't really mean that no forked data is used 
// hardhat will pull data for addressess from chain
// e.g. flashloaner.js tests will always work with fork either on localhost or 
// hardhat chain
function isForkedMainnet() {
  return getConfigNetworkName() == 'hardhat' ? true : false
}

// return ChainID specified in hardhat.config.js
function getConfigChainID() {
  return network.config.chainId
}

function isThisLiveNetwork() {
  let chainID = getConfigChainID()
  return (chainID != 31337)
}

function isLocalTestnet() { 
  return (getConfigChainID() == 31337)
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

async function resetHardhatToBlock(blockNumber){
  await network.provider.request({
      method: "hardhat_reset",
      params: [
          {
          forking: {
              jsonRpcUrl: process.env.ALCHEMY_MAINNET_URL !== undefined ? process.env.ALCHEMY_MAINNET_URL : "",
              blockNumber: blockNumber,  
          },
          },
      ],
      });
}

module.exports = { 
  GasReporter, 
  increaseTimeBy, 
  getBalance,
  getFormattedBalance,
  isForkedMainnet,
  getConfigChainID,
  getConfigNumConfirmations,
  getImpersonatedSigner,
  resetHardhatToBlock,
  isThisLiveNetwork,
  isLocalTestnet
}
