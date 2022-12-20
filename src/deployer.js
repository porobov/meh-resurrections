const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const { ethers } = require("hardhat")
const { BigNumber } = require("ethers")
const { GasReporter, increaseTimeBy, getConfigChainID, getConfigNumConfirmations, getImpersonatedSigner } = require("../src/tools.js")
const conf = require('../conf.js')
const { concat } = require('ethers/lib/utils.js')

const oldMehAbi = conf.oldMehAbi
const newMehAbi = conf.newMehAbi
const wethAbi = conf.wethAbi
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const gasReporter = new GasReporter()

// 😱
async function deployToProduction () {

}

async function setupTestEnvironment() {
    return await releaseWrapper()
}

// deployer and setup script used in tests and in production too
// will setup referrals, deploy and setup wrapper
async function releaseWrapper() {
    // LOAD AND CHECK VARS
    ;[owner] = await ethers.getSigners()
    const exEnv = new ProjectEnvironment(getConfigChainID(), owner)
    const deployer = new Deployer(exEnv)
    return await deployer.deployLocally() 
  }

// deploy params DeployParams
class ProjectEnvironment {
    constructor(chainID, operatorWallet) {
        this.chainID = chainID
        this.numConf = getConfigNumConfirmations(chainID)
        this.isLocalTestnet = false
        this.operatorWallet = operatorWallet
        this.isUsingMocks = false
        this.existingEnvironmentPath = this.getPath(chainID)
        this.defaultJSON = {
            'mehAdminAddress': '0xF51f08910eC370DB5977Cff3D01dF4DfB06BfBe1',
            'mocksOwner': '',
            'weth': conf.wethAddress,
            'soloMargin': '0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e',
            'meh2016': conf.oldMehAddress,
            'meh2018': conf.newMehAddress,
        }
        this.envJSON = {}
        this.referralActivationTime = 3600

        this.soloMarginAddress
        this.mehAdminAddress
        this.meh2018
        
        this.meh2016
        this.weth
    }

    getPath(chainID) {
        let filename = chainID.toString() + '_addresses.json'
        return path.join(__dirname, '../test/mocking', filename)
    }

    async loadExistingEnvironment() {
        if (this.chainID == '31337') {
            this.isLocalTestnet = true
        }
        // LOAD MOCKS OR REAL ADDRESSES
        let addressesJSON
        let message
        try {
            addressesJSON = JSON.parse(fs.readFileSync(this.existingEnvironmentPath))
            message = chalk.green('loaded mock addresses for chainID: ' + this.chainID)
            this.isUsingMocks = true
        } catch (err) {
            addressesJSON = this.defaultJSON
            message = chalk.red('loaded real contract addresses')
            this.isUsingMocks = false
        }

        console.log(message)
        console.log(addressesJSON)
        
        // LOAD MEH ADMIN
        let mehAdmin
        if (this.isUsingMocks == true) {
            // current owner must be the same as the one who deployed mocks
            if (addressesJSON.mocksOwner == this.operatorWallet.address) {
                mehAdmin = this.operatorWallet
            } else {
                console.log(chalk.red('Current wallet differs from the one used to deploy mocks'))
            }
        } else {
            if (getConfigChainID() == '1') {
                throw('read mehAdmin key from disk (not implemented yet)')
            } else {
                mehAdmin = await getImpersonatedSigner(addressesJSON.mehAdminAddress)
            }
        }

        // // INIT CONTRACTS
        // this.soloMarginAddress = addressesJSON.soloMargin // soloMarginAddress
        // return addressesJSON
        // TODO put Real meh2018 here ↓↓↓

        // this.meh2018 = await ethers.getContractAt("IMeh2018", addressesJSON.meh2018)
        this.meh2018 = new ethers.Contract(addressesJSON.meh2018, newMehAbi, this.operatorWallet)
        this.meh2016 = new ethers.Contract(addressesJSON.meh2016, oldMehAbi, mehAdmin)
        this.weth = await ethers.getContractAt("WETH9", addressesJSON.weth)
        this.soloMarginAddress = addressesJSON.soloMargin
        this.mehAdminAddress = mehAdmin.address
    }

    createExistingEnvironment(json) {
        fs.writeFileSync(this.existingEnvironmentPath, JSON.stringify(json))
        console.log('Wrote mock addresses for chainID:', this.chainID)
        }

    async waitForActivationTime(level) {
        if (this.isLocalTestnet) {
            await increaseTimeBy(this.referralActivationTime * (2 ** (level - 1)))
        } else {
            throw("Live network cannot wait for activation time")
        }
    }
  }

// deploy mocks to a testnet
async function deployMocks() {
    ;[owner] = await ethers.getSigners()
    console.log(
        "Deploying mocks to Chain ID:", getConfigChainID(), 
        "\nConfirmations:", getConfigNumConfirmations(),
        "\nDeployed by:", owner.address)
    // mocks
    const weth = await deployContract("WETH9", {"isVerbouse": true})
    const soloMargin = await deployContract("SoloMarginMock", {"isVerbouse": true})
    const meh2016 = await deployContract("MillionEtherMock", {"isVerbouse": true})
    const meh2018 = await deployContract("Meh2018Mock", {"isVerbouse": true})
    const mockEnv = new ProjectEnvironment(getConfigChainID())
    mockEnv.createExistingEnvironment({
        'mehAdminAddress': owner.address,
        'mocksOwner': owner.address,
        'weth': weth.address,
        'soloMargin': soloMargin.address,
        'meh2016': meh2016.address,
        'meh2018': meh2018.address,
    })
}








class Deployer {
    constructor(existingEnvironment) {
        this.exEnv = existingEnvironment
    }

    // will initialize and load previous state
    async initialize(){
        this.isSavingOnDisk = false
        await this.exEnv.loadExistingEnvironment()
        this.referralFactory
        this.referralsAddr = [this.exEnv.mehAdminAddress] // TODO remove this array it's an unnecessary duplicate
        this.referrals = []  // referral contracts only
        this.mehWrapper
    }

    async deployLocally() {
        await this.initialize()

        await this.unpauseMeh2016()
        await this.deployReferralFactory()
        await this.deployReferrals()

        await this.deployWrapper()

        await this.pairRefsAndWrapper()
        await this.setMeh2016CharityAddress(this.getFirstReferralAddr())
        // wrapper signs in to old meh
        await this.mehWrapper.signIn(this.referrals[this.referrals.length-1].address)

        // FLASHLOAN
        // put more than 2 wei to mehWrapper contract (SoloMargin requirement)
        await this.exEnv.weth.deposit({value: 2})
        await this.exEnv.weth.transfer(this.mehWrapper.address, 2)

        gasReporter.reportToConsole()

        return {
            oldMeh: this.exEnv.meh2016,
            mehWrapper: this.mehWrapper,
            referrals: this.referrals,
            owner: this.exEnv.operatorWallet
          }
    }

    // this address is used as 0 referral (not a contract)
    getMehAdminAddr() {
        return this.referralsAddr[0]
    }

    // returns first referral-contract in chain
    getFirstReferralAddr() {
        return this.referrals[0].address
    }

    getLastReferralArrd() {
        return this.referrals[(this.referrals.length - 1)].address
    }

    // unpause oldMEH (refferals register in oldMeh at deploy)
    async unpauseMeh2016() {
        await this.exEnv.meh2016.adminContractSecurity(ZERO_ADDRESS, false, false, false)
    }

    // set first contract-referral as charity address
    // used to be referrals[0].address
    async setMeh2016CharityAddress(charityAddress) {
        console.log("Setting charity address:", charityAddress)
        await this.exEnv.meh2016.adminContractSettings(0, charityAddress, 0)
    }

    // will deploy factory. Need unpaused MEH
    async deployReferralFactory() {
        // TODO check if MEH is paused ()
        console.log("Deploying referral factory")
        const referralFactoryFactory = await ethers.getContractFactory("ReferralFactory");
        this.referralFactory = await referralFactoryFactory.deploy(
            this.exEnv.meh2016.address, 
            this.getMehAdminAddr());
    }

    async setUpReferral(referralAddress) {
        const tx = await this.referralFactory.createReferral(this.exEnv.meh2016.address, referralAddress)
        const reciept = await tx.wait(this.exEnv.numConf)
        const blockNumber = reciept.blockNumber
        const eventFilter = this.referralFactory.filters.NewReferral()
        const events = await this.referralFactory.queryFilter(eventFilter, blockNumber, blockNumber)
        const newRefAddress = events[0].args.newReferralAddr
        const refGasUsed = reciept.gasUsed;
        const referral = await ethers.getContractAt("Referral", newRefAddress)
        // this.gasReporter.addGasRecord("Referrals", refGasUsed)
        console.log("Deployed referral:", referral.address )
        return referral
    }

    async deployReferrals() {
        let currentReferralAddr = this.referralsAddr[this.referralsAddr.length-1]
        let level = this.referralsAddr.length + 1  // TODO check this logic
        let newRef
        for (level; level <= 8; level++) {  // TODO previously it was 7 
          newRef = await this.setUpReferral(currentReferralAddr)
          await this.exEnv.waitForActivationTime(level)
          this.referrals.push(newRef)
          currentReferralAddr = newRef.address
        }
      }
    
    // Pairs referrals and wrapper
    async pairRefsAndWrapper() {
        console.log("Registering referrals...")
        let referralsGas = BigNumber.from(0)
        for (let referral of this.referrals) {
            await referral.setWrapper(this.mehWrapper.address)
            const receipt = await (await this.mehWrapper.addRefferal(referral.address)).wait(this.exEnv.numConf)
            referralsGas += receipt.gasUsed
            console.log("Registered ref:", referral.address)
        }
        // this.gasReporter.addGasRecord("Registering referrals", referralsGas)
    }

    // DEPLOY WRAPPER
    // wrapper constructor(meh2016address, meh2018address, wethAddress, soloMarginAddress)
    async deployWrapper() {
        console.log("Deploying wrapper...")
        this.mehWrapper = await deployContract(
            "MehWrapper", 
            {"isVerbouse": true, "gasReporter": gasReporter},
            this.exEnv.meh2016.address,
            this.exEnv.meh2018.address,
            this.exEnv.weth.address,
            this.exEnv.soloMarginAddress,
        )
        await this.mehWrapper.deployed() // wait numConf TODO?
        console.log("MehWrapper deplyed to:", this.mehWrapper.address)
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

module.exports = {
    setupTestEnvironment,
    deployMocks,
    releaseWrapper
}
