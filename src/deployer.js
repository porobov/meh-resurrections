const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const { ethers } = require("hardhat")
const { BigNumber } = require("ethers")
const { GasReporter, increaseTimeBy, getConfigChainID, getConfigNumConfirmations, getImpersonatedSigner, resetHardhatToBlock, isLocalTestnet, isThisLiveNetwork } = require("../src/tools.js")
const conf = require('../conf.js')
const { concat } = require('ethers/lib/utils.js')

const oldMehAbi = conf.oldMehAbi
const newMehAbi = conf.newMehAbi
const wethAbi = conf.wethAbi
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const gasReporter = new GasReporter()
const NUM_OF_REFERRALS = 7
// current timestamp = 1673521526 = 2 ** 30.64
// 315360000 = 2 ** 28.23 (10 years)
// (1) 1988881526 = 2 ** 30.89 (activation time at 1st level) (timestamp + setting delay)
// (2) 2304241526 = 2 ** 31.1
// (7) 21856561526 = 2 ** 34.35
// activation_time = uint32(block.timestamp + _setting_delay * (2**(_currentLevel-1)))
// TODO // 2 ** 30.64 + 7 * 2 ** t = 2 ** 32 // find t 
const NEW_DELAY = 315360000 // 10 years or 2 ** 28.23  // setting_delay is in uint32

// deployer and setup script used in tests
// will setup referrals, deploy and setup wrapper
// ensures all contracts are in clean state either by fork or redeploying
async function setupTestEnvironment(isDeployingMocks = true) {

    ;[owner] = await ethers.getSigners()
    const exEnv = new ProjectEnvironment(owner)

    // reset fork or redeploy mocks
    if (isDeployingMocks) {
        await exEnv.deployMocks(false)  // not saving mocks on disk
    } else {
        // resetting hardfork (before loading existing env and impersonating admin!!!)
        await resetHardhatToBlock(conf.mainnetBlockWhenMEHWasPaused)  // TODO make configurable depending on chain 
        await exEnv.loadExistingEnvironment()
    }
    const deployer = new Deployer(exEnv, {isSavingOnDisk: false})
    return await deployer.deployAndSetup()
}

// for live testnet
async function setupMocks() {
    ;[owner] = await ethers.getSigners()
    const exEnv = new ProjectEnvironment(owner)
    await exEnv.deployMocks(true)
}

// for live testnet
async function setupWrapper() {
    ;[owner] = await ethers.getSigners()
    const exEnv = new ProjectEnvironment(owner)
    await exEnv.loadExistingEnvironment()
}



// deploy params DeployParams
class ProjectEnvironment {
    constructor(operatorWallet) {
        this.chainID = getConfigChainID()
        this.numConf = getConfigNumConfirmations(this.chainID)
        this.isLocalTestnet = isLocalTestnet()
        this.isUsingMocks = false
        this.operatorWallet = operatorWallet
        this.existingEnvironmentPath = this.getPath(this.chainID)
        this.defaultJSON = {
            'mehAdminAddress': '0xF51f08910eC370DB5977Cff3D01dF4DfB06BfBe1',
            'mocksOwner': '',
            'weth': conf.wethAddress,
            'soloMargin': '0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e',
            'meh2016': conf.oldMehAddress,
            'meh2018': conf.newMehAddress,
        }
        this.referralActivationTime = 3600

        this.soloMarginAddress
        this.mehAdminAddress
        this.meh2018
        this.meh2016
        this.weth
    }

    // deploy mocks to a testnet (local or remote)
    async deployMocks(isSavingToDisk = false) {
        ;[owner] = await ethers.getSigners()
        console.log(
            "Deploying mocks to Chain ID:", getConfigChainID(), 
            "\nConfirmations:", getConfigNumConfirmations(),
            "\nDeployed by:", owner.address)
        // mocks
        this.weth = await deployContract("WETH9", {"isVerbouse": true})
        this.soloMargin = await deployContract("SoloMarginMock", {"isVerbouse": true}, this.weth.address)
        this.meh2016 = await deployContract("MillionEtherMock", {"isVerbouse": true})
        this.meh2018 = await deployContract("Meh2018Mock", {"isVerbouse": true})
        this.soloMarginAddress = this.soloMargin.address
        this.mehAdminAddress = owner.address
        this.isUsingMocks = true

        // sending ETH to weth mock
        // Flashloaner contract will use this eth to buy from OldMEH
        // It converts weth from solomargin to eth (and then back)
        await this.weth.deposit({
            value: ethers.utils.parseEther("2.0")
        })

        // minting weth to soloMargin
        // Solomargin needs a pool of weth to issue loans
        const SOLO_WETH_POOL_SIZE = ethers.utils.parseUnits("1000000", "ether")
        await this.weth.mintTo(this.soloMargin.address, SOLO_WETH_POOL_SIZE)

        if (isSavingToDisk) {
            this.saveExistingEnvironment({
                'mehAdminAddress': owner.address,
                'mocksOwner': owner.address,
                'weth': this.weth.address,
                'soloMargin': this.soloMargin.address,
                'meh2016': this.meh2016.address,
                'meh2018': this.meh2018.address,
            })
        }
    }

    saveExistingEnvironment(json) {
        fs.writeFileSync(this.existingEnvironmentPath, JSON.stringify(json, null, 2))
        console.log('Wrote mock addresses for chainID:', this.chainID)
        }

    async loadExistingEnvironment() {
        // check if contracts already exist - means we are using mocks
        let mocksAreLoaded = false 
        if (this.meh2018 && this.meh2016 && this.weth && this.soloMarginAddress && this.mehAdminAddress) {
            mocksAreLoaded = true
            this.isUsingMocks = true
        }

        // LOAD MOCKS OR REAL ADDRESSES
        let addressesJSON
        let message
        // check if mocks are saved on disk - also means we
        if (!mocksAreLoaded) {
            try {
                addressesJSON = JSON.parse(fs.readFileSync(this.existingEnvironmentPath))
                message = chalk.green('loaded mock addresses for chainID: ' + this.chainID)
                this.isUsingMocks = true
            } catch (err) {
                console.log("Mocks don't exist")
            }
        }
        
        // load defaults if not using mocks
        if (this.isUsingMocks != true) {
            addressesJSON = this.defaultJSON
            message = chalk.red('loaded real contract addresses')
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
                // check that operator wallet is real Meh admin
                throw('read mehAdmin key from disk (not implemented yet)') 
            } else {
                console.log("Impersonating admin...")
                mehAdmin = await getImpersonatedSigner(addressesJSON.mehAdminAddress)
                // await getImpersonatedSigner(addressesJSON.mehAdminAddress)
            }
        }

        // // INIT CONTRACTS
        this.meh2018 = new ethers.Contract(addressesJSON.meh2018, newMehAbi, this.operatorWallet)
        this.meh2016 = new ethers.Contract(addressesJSON.meh2016, oldMehAbi, mehAdmin)
        this.weth = await ethers.getContractAt("WETH9", addressesJSON.weth)
        this.soloMarginAddress = addressesJSON.soloMargin
        this.mehAdminAddress = await mehAdmin.getAddress()
    }
    
    // mintTo(address guy, uint wad)
    async mintWeth(recipient, amountInWeth) {
        const amountInWei = ethers.utils.parseUnits(amountInWeth, "ether")
        await this.weth.mintTo(recipient, amountInWei)
        console.log("minted", amountInWeth, "weth to", recipient )
    }

    async waitForActivationTime(level) {
        if (this.isLocalTestnet) {
            await increaseTimeBy(this.referralActivationTime * (2 ** (level - 1)))
        } else {
            throw("Live network cannot wait for activation time")
        }
    }

    getPath(chainID) {
        let filename = chainID.toString() + '_addresses.json'
        return path.join(__dirname, '../test/mocking', filename)
    }
  }




class Constants {
    constructor(chainID) {
        try {
            this.constants = JSON.parse(fs.readFileSync(this.getPath(chainID)))
        } catch (err) {
            this.constants = {}
            console.log("No constants for chain id", chainID)
        }
    }

    add(record) {
        this.constants = {
            ...this.constants,
            ...record
        }
    }

    get() {
        return this.constants
    }

    save(chainID) {
        fs.writeFileSync(this.getPath(chainID), JSON.stringify(this.constants, null, 2))
    }

    getPath(chainID) {
        let filename = chainID.toString() + '_constants.json'
        return path.join(__dirname, '../constants', filename)
    }
}


class Deployer {
    constructor(existingEnvironment, options) {
        this.isSavingOnDisk = options.isSavingOnDisk
        this.isLiveNetwork = !isLocalTestnet()
        this.exEnv = existingEnvironment
        this.constants = new Constants(getConfigChainID())
        
    }

    // will initialize and load previous state
    async initialize(){
        if (this.exEnv.isInitialized == false) throw ("Existing env is not initialized")
        await this.loadConstants()
    }

    async loadConstants() {
        let cnsts = this.constants.get()

        if (cnsts.referralFactoryAddr) {
            this.referralFactory = await ethers.getContractAt("ReferralFactory", cnsts.referralFactoryAddr)
        }

        if (cnsts.referralsAddresses) {
            this.referrals = []
            for (let referralAddr of cnsts.referralsAddresses) {
                this.referrals.push(await ethers.getContractAt("Referral", referralAddr))
            }
        } else {
            this.referrals = []
        }
        
        if (cnsts.wrapperAddresses) {
            this.wrapper = await ethers.getContractAt("MehWrapper", cnsts.wrapperAddresses)
        }
        
        cnsts.areRefsAndWrapperPaired ? this.areRefsAndWrapperPaired = cnsts.areRefsAndWrapperPaired : {} 
    }

    // deloy
    async deployAndSetup() {

        await this.initialize()

        // 
        try {
            await this.unpauseMeh2016()
            this.referralFactory ? {} : 
                await this.deployReferralFactory()
            await this.pauseMeh2016()

            this.numOfReferrals() >= NUM_OF_REFERRALS ? {} : 
                await this.deployReferrals()
            
            this.wrapper ? {} : 
                await this.deployWrapper()

            this.areRefsAndWrapperPaired ? {} :
                await this.pairRefsAndWrapper()

            // wrapper signs in to old meh
            await this.unpauseMeh2016()
            await this.mehWrapper.signIn(this.getLastReferral().address)
            
            // setting charity address and NEW_DELAY
            await this.finalMeh2016settings()

            // FLASHLOAN 
            // put more than 2 wei to mehWrapper contract (SoloMargin requirement)
            await this.exEnv.weth.deposit({value: 2})
            await this.exEnv.weth.transfer(this.mehWrapper.address, 2)
        } catch (e) {
            throw e
        } finally {
            // add constants from existing environment
            this.constants.add({
                'weth': this.exEnv.weth.address,
                'soloMargin': this.exEnv.soloMarginAddress,  // solomargin contract itself is not always present in exEnv
                'meh2016': this.exEnv.meh2016.address,
                'meh2018': this.exEnv.meh2018.address,
            })
            this.isSavingOnDisk || this.isLiveNetwork ? 
                this.constants.save(getConfigChainID()) : {}
        }
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
        return this.exEnv.mehAdminAddress
    }

    // returns first referral-contract in chain
    getFirstReferral() {
        return this.referrals[0]
    }

    getLastReferral() {
        return this.referrals[this.referrals.length - 1]
    }

    numOfReferrals() {
        return this.referrals.length
    }

    // unpause oldMEH (refferals register in oldMeh at deploy)
    // function adminContractSecurity (address violator, bool banViolator, bool pauseContract, bool refundInvestments)
    async unpauseMeh2016() {
        await this.exEnv.meh2016.adminContractSecurity(ZERO_ADDRESS, false, false, false)
        console.log("MEH unpaused...")
    }

    async pauseMeh2016() {
        await this.exEnv.meh2016.adminContractSecurity(ZERO_ADDRESS, false, true, false)
        console.log("MEH paused...")
    }

    // set first contract-referral as charity address
    
    // used to be referrals[0].address
    //function adminContractSettings (
        // uint32 newDelayInSeconds, 
        // address newCharityAddress, 
        // uint newImagePlacementPriceInWei)
    async finalMeh2016settings() {
        let charityAddress = this.getFirstReferral().address
        console.log("Setting charity address:", charityAddress)
        console.log("Setting new delay in seconds:", NEW_DELAY)
        await this.exEnv.meh2016.adminContractSettings(NEW_DELAY, charityAddress, 0)
    }

    // will deploy factory. Need unpaused MEH
    async deployReferralFactory() {
        // TODO check if MEH is paused ()
        console.log("Deploying referral factory")
        const referralFactoryFactory = await ethers.getContractFactory("ReferralFactory");
        this.referralFactory = await referralFactoryFactory.deploy(
            this.exEnv.meh2016.address, 
            this.getMehAdminAddr());
        this.constants.add({referralFactoryAddr: this.referralFactory.address})
    }

    async setUpReferral(referralAddress) {
        await this.unpauseMeh2016()
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
        await this.pauseMeh2016()
        return referral
    }

    // deploy the whole chain of referrals in tests 
    async deployReferrals() {
        // level shows how far it is from mehAdmin (who is 0)
        let level = this.numOfReferrals() + 1
        let currentReferralAddr = this.getMehAdminAddr()
        if (level > 1) {
            currentReferralAddr = this.getLastReferral()
        }
        for (level; level <= NUM_OF_REFERRALS; level++) {
          let newRef = await this.setUpReferral(currentReferralAddr)
          this.referrals.push(newRef)
          currentReferralAddr = newRef.address
          if (this.isLiveNetwork) {
            console.log("Live network. Wait for activation time and rerun script")
            break 
          } else { 
            await this.exEnv.waitForActivationTime(level) }
        }
        this.constants.add({referralsAddresses: this.referrals.map(ref => ref.address)})
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
        this.constants.add({areRefsAndWrapperPaired: true})
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
        this.constants.add({wrapperAddresses: this.mehWrapper.address})
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
    setupWrapper,
    setupMocks
}
