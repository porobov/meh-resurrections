const { ethers, network } = require("hardhat");
const helpers = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const fs = require('fs');
const readline = require('readline');

// returns impersonated signer for local hardfork
// if "ProviderError: unknown account..." see below
// https://github.com/NomicFoundation/hardhat/issues/1226 
async function getImpersonatedSigner(addr) {
  // old solution
  // hre.network.provider.request({
  //     method: "hardhat_impersonateAccount",
  //     params: [addr],
  //   });
  // return ethers.getSigner(addr)
  // return await helpers.impersonateAccount(addr)
  return ethers.getImpersonatedSigner(addr);
}

// returns signer from a keystore file
async function getRealMehAdminSigner() {
  const keystorePath = process.env.MEH_ADMIN_KEYSTORE_PATH;
  if (!keystorePath) {
    throw new Error('MEH_ADMIN_KEYSTORE_PATH env variable not set');
  }
  const keystore = fs.readFileSync(keystorePath, 'utf8');

  // Use password from environment variable
  const password = process.env.MEH_ADMIN_KEYSTORE_PASSWORD;
  if (!password) {
    throw new Error('MEH_ADMIN_KEYSTORE_PASSWORD env variable not set');
  }

  // Always prompt user to proceed
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true
  });
  await new Promise((resolve) => {
    rl.question('You are about to use the admin key. Proceed? (y/N): ', (answer) => {
      rl.close();
      if (answer.trim().toLowerCase() !== 'y') {
        throw new Error('Aborted by user.');
      }
      resolve();
    });
  });

  // Decrypt wallet
  const wallet = await ethers.Wallet.fromEncryptedJson(keystore, password);
  return wallet.connect(ethers.provider);
}

// open zeppelin's time doesn't work for some reason (maybe me, maybe hardfork)
async function increaseTimeBy(seconds) {
  await network.provider.send("evm_increaseTime", [seconds])
  await network.provider.send("evm_mine") // this one will have 02:00 PM as its timestamp
}

//await ethers.getDefaultProvider().getBalance(address) - will always querry chain data
async function getFormattedBalance(address) {
  return ethers.formatEther(await getBalance(address))
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

// returns RPC node address
function getConfigNetworkUrl() {
  return network.config.forking ? network.config.forking.url : network.config.url
}

function isLiveNetwork() {
  return !isLocalTestnet()
}

// "hardhat" network got same id
function isLocalTestnet() {
  return (getConfigChainID() == 31337)
}

function getConfigNumConfirmations() {
  return network.config.numConfirmations
}

class GasReporter {

  constructor() {
    this.report = ''
    this.totalGasCostEth = 0
    this.totalGasCostsUsd = 0
  }

  addGasRecord(functionName, gasUsed) {
    const gasPrice = process.env.GAS_PRICE_GWEI !== undefined ? process.env.GAS_PRICE_GWEI : 0
    const usd = process.env.ETH_USD_USD !== undefined ? process.env.ETH_USD_USD : 0
    const gasCostsEth = parseFloat(ethers.formatEther(gasUsed * (ethers.parseUnits(gasPrice, "gwei"))))
    const gasCostsUsd = gasCostsEth * usd
    this.report +=
      `${functionName}: ${gasUsed} gas | ${gasCostsEth} Eth | ${gasCostsUsd} USD | (gas price: ${gasPrice} Gwei, ETHUSD: ${usd}) \n`
    this.totalGasCostEth += gasCostsEth  // converting to number
    this.totalGasCostsUsd += gasCostsUsd
  }

  reportToConsole() {
    console.log("Gas\n", this.report)
    console.log("--------------------------------")
    console.log(`TOTAL GAS: ${this.totalGasCostEth} Eth | ${this.totalGasCostsUsd} USD`)
  }
}

async function resetHardhatToBlock(blockNumber) {
  await helpers.reset(getConfigNetworkUrl(), blockNumber);
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
  isLiveNetwork,
  isLocalTestnet,
  getConfigNetworkUrl,
  getRealMehAdminSigner
}
