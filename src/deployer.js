const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const { ethers } = require("hardhat")
const { BigNumber } = require("ethers")
const { GasReporter, increaseTimeBy, getConfigChainID, getConfigNumConfirmations } = require("../src/tools.js")
const conf = require('../conf.js')

const oldMehAbi = conf.oldMehAbi
const newMehAbi = conf.newMehAbi
const oldMehAddress = conf.oldMehAddress
const newMehAddress = conf.newMehAddress
const wethAbi = conf.wethAbi
const wethAddress = conf.wethAddress
const mehAdminAddress = "0xF51f08910eC370DB5977Cff3D01dF4DfB06BfBe1"
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const gasReporter = new GasReporter()
const soloMarginAddress = '0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e'

// 😱
async function deployToProduction () {

}

class ExistingEnvironment {
    constructor(chainID) {
        this.chainID = chainID
        this.path = this.getPath(chainID)
        this.defaultJSON = {
            'weth': wethAddress,
            'soloMargin': soloMarginAddress,
            'meh2016': oldMehAddress,
            'meh2018': newMehAddress,
        }
    }

    getPath(chainID) {
        let filename = chainID.toString() + '_addresses.json'
        return path.join(__dirname, '../test/mocking', filename)
    }

    load() {
        let addressesJSON
        let message
        try {
            addressesJSON = JSON.parse(fs.readFileSync(this.path))
            message = chalk.green('loaded mock addresses for chainID: ' + this.chainID)
        } catch (err) {
            addressesJSON = this.defaultJSON
            message = chalk.red('loaded real contract addresses')
        } finally {
            console.log(message)
            return addressesJSON
        }
    }

    save(weth,soloMargin,meh2016,meh2018) {
        const addressesJSON = {
            'weth': weth,
            'soloMargin': soloMargin,
            'meh2016': meh2016,
            'meh2018': meh2018,
        }

        fs.writeFileSync(this.path, JSON.stringify(addressesJSON))
        console.log('Wrote mock addresses for chainID:', this.chainID)
        }
  }

// deploy mocks to a testnet
async function deployMocks() {
    console.log("Deploying mocks to Chain ID:", getConfigChainID(), "confirmations:", getConfigNumConfirmations())
    // WETH mock 
    const weth = await deployContract("WETH9", {"isVerbouse": true})
    const soloMargin = await deployContract("SoloMarginMock", {"isVerbouse": true})
    const meh2016 = await deployContract("MillionEtherMock", {"isVerbouse": true})
    const meh2018 = await deployContract("Meh2018Mock", {"isVerbouse": true})
    const mockEnv = new ExistingEnvironment(getConfigChainID())
    mockEnv.save(weth,soloMargin,meh2016,meh2018)
}
async function setupTestEnvironment() {
    return await releaseWrapper()
}

// deployer and setup script used in tests and in production too
// will setup referrals, deploy and setup wrapper
async function releaseWrapper() {
    ;[owner] = await ethers.getSigners()
    const exEnv = new ExistingEnvironment(getConfigChainID())
    const paramExistingEnvironment = exEnv.load()
    // deploy wrapper
    // wrapper constructor(meh2016address, meh2018address, wethAddress, soloMarginAddress)
    const mehWrapper = await deployContract(
        "MehWrapper", 
        {"isVerbouse": true, "gasReporter": gasReporter},
        paramExistingEnvironment.meh2016, // oldMehAddress,
        paramExistingEnvironment.meh2018, // newMehAddress,
        paramExistingEnvironment.weth, //  wethAddress,
        paramExistingEnvironment.soloMargin // soloMarginAddress
        )


    
    // TODO
    // make mocks work locally
    // weth and oldMeh should load from mocks when using mocks
    // chain of referrals



    // FLASHLOAN
    // put more than 2 wei to mehWrapper contract (SoloMargin requirement)
    const weth = new ethers.Contract(wethAddress, wethAbi, owner)
    await weth.deposit({value: 2})
    await weth.transfer(mehWrapper.address, 2)
  
    // REFERRALS
    const mehAdmin = await getImpersonatedSigner(mehAdminAddress)

    // get oldMeh instance
    const oldMeh = new ethers.Contract(oldMehAddress, oldMehAbi, mehAdmin)
    // unpause oldMEH
    await oldMeh.adminContractSecurity(ZERO_ADDRESS, false, false, false)
    // deploy and setup chain of referrals (writes to oldMEH)
    const referrals = await setupChainOfReferrals(mehAdmin, oldMehAddress, mehWrapper, gasReporter)
    // set first referral as charity address
    await oldMeh.adminContractSettings(0, referrals[0].address, 0)
    // wrapper signs in to old meh
    await mehWrapper.signIn(referrals[referrals.length-1].address)

    // gasReporter.addGasRecord("Meh wrapper deployment", mehWrapperGasUsed)
    gasReporter.reportToConsole()
  
    return {
      oldMeh: oldMeh,
      mehWrapper: mehWrapper,
      referrals: referrals,
      owner: owner
    }
  }

// helper to deploy any contract by name
async function deployContract(contractName, options, ...args) {
    let isVerbouse = false
    let gasReporter = undefined
    if (options) {
        if (options.hasOwnProperty("isVerbouse")) {
            isVerbouse = options.isVerbouse
        }
        if (options.hasOwnProperty("gasReporter")) {
            gasReporter = options.gasReporter
        }
    }
    const contrFactory = await ethers.getContractFactory(contractName)
    const contr = await contrFactory.deploy(...args)
    const reciept = await contr.deployTransaction.wait()
    if (gasReporter !== undefined) {
        gasReporter.addGasRecord(`${contractName} gas`, reciept.gasUsed)
    }
    await contr.deployed()
    if (isVerbouse) {
        console.log(`Deployed ${contractName} to ${contr.address}`)
    }
    return contr
}

// returns impersonated signer for local hardfork
async function getImpersonatedSigner(addr) {
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [addr],
      });
    return ethers.getSigner(addr)
}

// REFERRALS
async function setupChainOfReferrals(firstReferral, oldMehAddress, mehWrapper, gasReporter) {
    const referrals = []
    let currentReferral = firstReferral
    let newRef
    let referralsGas = BigNumber.from(0)

    const referralFactoryFactory = await ethers.getContractFactory("ReferralFactory");
    const referralFactory = await referralFactoryFactory.deploy(oldMehAddress, currentReferral.address);

    for (let level = 1; level <= 7; level++) {
      newRef = await setUpReferral(referralFactory, currentReferral.address, level, oldMehAddress, mehWrapper.address, gasReporter)
      referrals.push(newRef)
      const receipt = await (await mehWrapper.addRefferal(newRef.address)).wait()
      referralsGas.add(receipt.gasUsed)
      currentReferral = newRef
    }
    return referrals
  }
  
  async function setUpReferral(referralFactory, referralAddress, level, oldMehAddress, wrapperAddress, gasReporter) {
      const tx = await referralFactory.createReferral(oldMehAddress, referralAddress)
  
      // const chainId = await referralFactory.signer.getChainId()
      const reciept = await tx.wait(1) // TODO check numconfirmation depending on network 
      const blockNumber = reciept.blockNumber
      const eventFilter = referralFactory.filters.NewReferral()
      const events = await referralFactory.queryFilter(eventFilter, blockNumber, blockNumber)
      const newRefAddress = events[0].args.newReferralAddr
  
      const refGasUsed = reciept.gasUsed;
      const referral = await ethers.getContractAt("Referral", newRefAddress)
  
      await referral.setWrapper(wrapperAddress)
      await waitForActivationTime(level)
      gasReporter.addGasRecord("Referrals", refGasUsed)
      return referral
  }

async function waitForActivationTime(level) {
    await increaseTimeBy(3600 * (2 ** (level - 1)))
}

module.exports = {
    setupTestEnvironment,
    deployMocks,
    releaseWrapper
}
