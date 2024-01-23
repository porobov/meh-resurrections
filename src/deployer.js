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
// 
const NUM_OF_REFERRALS = conf.NUM_OF_REFERRALS
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
async function setupTestEnvironment(options) {
    let isDeployingMinterAdapter = ("isDeployingMinterAdapter" in options) ? options.isDeployingMinterAdapter: false
    let isDeployingMocks = ("isDeployingMocks" in options) ? options.isDeployingMocks : false

    ;[owner] = await ethers.getSigners()
    const exEnv = new ProjectEnvironment(owner)

    // reset fork or redeploy mocks
    if (isDeployingMocks) {
        await exEnv.deployMocks(false)  // not saving mocks on disk
    } else {
        // resetting hardfork (before loading existing env and impersonating admin!!!)
        await resetHardhatToBlock(conf.forkBlock)  // TODO make configurable depending on chain 
        await exEnv.loadExistingEnvironment()
    }
    const deployer = new Deployer(exEnv, {
        isSavingOnDisk: false, 
        isDeployingMinterAdapter: isDeployingMinterAdapter})
    return await deployer.deployAndSetup()
}

// for live testnet
async function setupMocks() {
    ;[owner] = await ethers.getSigners()
    const exEnv = new ProjectEnvironment(owner)
    await exEnv.deployMocks(true)
}

// for live testnet 😱
async function releaseWrapper() {
    ;[owner] = await ethers.getSigners()
    const exEnv = new ProjectEnvironment(owner)
    await exEnv.loadExistingEnvironment()
    const deployer = new Deployer(exEnv, {isSavingOnDisk: true})
    return await deployer.deployAndSetup()
}


// Environment present before meh wrapper infrastructure.
// WETH, loanplatfrom, MEH2016 and MEH2018. 
// Any of these may be mocks or real addresses.
class ProjectEnvironment {
    constructor(operatorWallet) {
        this.chainID = getConfigChainID()
        this.numConf = getConfigNumConfirmations(this.chainID)
        this.realAddressesJSON = this.getRealAddressesJSON(this.chainID)
        this.mocksPath = this.getMocksPath(this.chainID)
        this.isLocalTestnet = isLocalTestnet()
        this.operatorWallet = operatorWallet
        this.referralActivationTime = 3600
        this.isMockingMEH = false

        this.soloMarginAddress
        this.mehAdminAddress
        this.meh2018
        this.meh2016
        this.weth
    }

    // FUTURE. move it to conf and tools. Have to rebuild multiple files 
    getRealAddressesJSON(chainID) {
        // will owerwrite mock address. Keep only exiting fields, no empty fields.
        const realAddresses = {
            "1":
            {
                'mehAdminAddress': conf.mehAdminAddress,
                'weth': conf.wethAddress,
                'soloMargin': conf.soloMarginAddress,
                'meh2016': conf.oldMehAddress,
                'meh2018': conf.newMehAddress,
            },
            "5":
            {
                'weth': conf.wethAddressGoerli,
                'soloMargin': conf.soloMarginAddressGoerli,
            }
        }
        return realAddresses?.[chainID] || {}
    }

    // deploy mocks to a testnet (local or remote)
    // mocks were needed to extensively test smart contracts when reaching Alchemy limits
    // mocks are also needed to test on a testNet
    // WARNING!!! Will deploy necessary mocks only. Will check existing 
    // WETH and flash loan contracts on a network
    async deployMocks(isSavingToDisk = false) {
        ;[owner] = await ethers.getSigners()
        console.log(
            "Deploying mocks to Chain ID:", getConfigChainID(), 
            "\nConfirmations:", getConfigNumConfirmations(),
            "\nDeploying from address:", owner.address)

        // Loan platform and WETH mocks
        // Will not deploy if got mocks on chain (e.g. goerli)
          
        if (!this.realAddressesJSON.weth && !this.realAddressesJSON.soloMargin) {
            this.weth = await deployContract("WETH9", { "isVerbouse": true })
            this.soloMargin = await deployContract("SoloMarginMock", { "isVerbouse": true }, this.weth.address)
            this.soloMarginAddress = this.soloMargin.address
            // sending ETH to weth mock
            // Flashloaner contract will use this eth to buy from OldMEH
            // It converts weth from solomargin to eth (and then back)
            // the cost of a block in meh2016 mock is 2 gwei
            await this.weth.deposit({
                value: ethers.utils.parseUnits("10", "gwei")
            })
            // minting weth to soloMargin
            // Solomargin needs a pool of weth to issue loans
            const SOLO_WETH_POOL_SIZE = ethers.utils.parseUnits("1000000", "ether")
            await this.weth.mintTo(this.soloMargin.address, SOLO_WETH_POOL_SIZE)
            console.log(chalk.red('Deployed weth and loan platform'))
        }

        // MEHs mocks (will not deploy for mainnet)
        // note that we are using Mocked version of MEH here!!! 
        // see the way it differs from the original
        if (!this.realAddressesJSON.meh2016 && !this.realAddressesJSON.meh2018) {
            this.meh2016 = await deployContract("MillionEtherMock", { "isVerbouse": true })
            this.meh2018 = await deployContract("Meh2018Mock", { "isVerbouse": true })
            this.mehAdminAddress = owner.address
            this.isMockingMEH = true
            console.log(chalk.red('WARNING!!! Meh is also a mock here. It may differ from the original'))
        }

        // only save existing properties
        if (isSavingToDisk) {
            this.saveExistingEnvironment({
                ...(this?.mehAdminAddress && {'mehAdminAddress': this.mehAdminAddress}),
                ...(this?.weth && {'weth': this?.weth.address}), 
                ...(this?.soloMargin && {'soloMargin': this.soloMargin.address}), 
                ...(this?.meh2016 && {'meh2016': this.meh2016.address}), 
                ...(this?.meh2018 && {'meh2018': this.meh2018.address}), 
            })
        }
    }

    saveExistingEnvironment(json) {
        fs.writeFileSync(this.mocksPath, JSON.stringify(json, null, 2))
        console.log('Wrote mocks addresses for chainID:', this.chainID, this.mocksPath)
        }

    // see comments on the ProjectEnvironment class
    async loadExistingEnvironment() {
        // CHECK IF CONTRACTS ALREADY EXIST - MEANS WE ARE USING MOCKS
        // TODO not sure if this is needed anywhere
        let mocksAreLoaded = false 
        if (this.meh2018 && this.meh2016 && this.weth && this.soloMarginAddress && this.mehAdminAddress) {
            mocksAreLoaded = true
            console.log(chalk.red("MOCKS ALREADY EXIST"))
            return
        }

        // LOAD MOCKS FROM DISK
        let mockAddressesJSON
        if (!mocksAreLoaded) {
            try {
                mockAddressesJSON = JSON.parse(fs.readFileSync(this.mocksPath))
                console.log(chalk.green('loaded mock addresses for chainID: ' + this.chainID))
            } catch (err) {
                console.log("Mocks don't exist")
            }
        }

        // OVERWRITE REAL ADDRESSES WITH MOCKS(IF PRESENT)
        // deployMocks will not create mocks if there are real addresses present
        // mainnet and testnets (goerli)
        let addressesJSON = {...this.realAddressesJSON, ...mockAddressesJSON}
        console.log(addressesJSON)
        
        // LOAD MEH ADMIN
        // only needed for MEH and referrals
        let mehAdmin
        if (this.isMockingMEH == true) {
            // current owner must be the same as the one who deployed mocks
            if (addressesJSON?.mehAdminAddress == this.operatorWallet.address) {
                mehAdmin = this.operatorWallet
                console.log(chalk.green('Loaded mehAdmin:', mehAdmin.address))
            } else {
                throw('Current wallet differs from the one used to deploy mocks')
            }

        } else {
            if (getConfigChainID() == '1') {
                // check that operator wallet is real Meh admin
                throw('read mehAdmin key from disk (not implemented yet)')  // TODO
            } else {
                console.log("Impersonating admin...")
                mehAdmin = await getImpersonatedSigner(addressesJSON.mehAdminAddress)
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

    getMocksPath(chainID) {
        let filename = chainID.toString() + '_addresses.json'
        return path.join(__dirname, '../test/mocking', filename)
    }
  }




// intended to store output of wrapper deployment (refs, wrapper address and other params)
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

    // see class comments
    getPath(chainID) {
        let filename = chainID.toString() + '_constants.json'
        return path.join(__dirname, '../constants', filename)
    }
}


class Deployer {
    constructor(existingEnvironment, options) {
        this.isDeployingMinterAdapter = ("isDeployingMinterAdapter" in options) ? options.isDeployingMinterAdapter: false
        this.newDelay = ("overrideDelay" in options) ? options.overrideDelay: NEW_DELAY
        this.isSavingOnDisk = options.isSavingOnDisk
        this.isLiveNetwork = !isLocalTestnet()
        this.exEnv = existingEnvironment
        this.constants = new Constants(getConfigChainID())
    }

    // will initialize and load previous state
    async initialize(){
        // TODO there's no such param in the ProjectEnv class 
        if (this.exEnv.isInitialized == false) throw ("Existing env is not initialized")
        await this.loadConstants()
    }

    // this relies to wrapper deployment only (existing environment + build summary)
    // this is different than existing environment (see project environment description)
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
            this.mehWrapper = await ethers.getContractAt("MehWrapper", cnsts.wrapperAddresses)
        }
        
        cnsts.areRefsAndWrapperPaired ? this.areRefsAndWrapperPaired = cnsts.areRefsAndWrapperPaired : {} 
    }

    // deploy
    async deployAndSetup() {

        await this.initialize()

        // 
        try {
            !this.referralFactory ?
                await this.deployReferralFactory() : {}

            if (this.referralFactory && (this.numOfReferrals() < NUM_OF_REFERRALS)){
                await this.deployReferrals()}
            
            if ((this.numOfReferrals() >= NUM_OF_REFERRALS) && !this.mehWrapper) {   
                await this.deployWrapper()}

            if (this.mehWrapper && !this.areRefsAndWrapperPaired){
                await this.pairRefsAndWrapper()}

            if (this.areRefsAndWrapperPaired) {
                // wrapper signs in to old meh
                await this.unpauseMeh2016()
                await this.mehWrapper.signIn()
                
                // setting charity address and NEW_DELAY
                await this.finalMeh2016settings()

                // FLASHLOAN
                // SoloMargin charges 2 wei per loan. Here we put 20000 wei
                // in advance for 10000 loans
                console.log("Depositing WETH to wrapper")
                await this.exEnv.weth.deposit({value: 20000})
                await this.exEnv.weth.transfer(this.mehWrapper.address, 20000)
            }
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
            // TODO why this.isLiveNetwork here? and why isLiveNetwork at all?
            this.isSavingOnDisk || this.isLiveNetwork ? 
                this.constants.save(getConfigChainID()) : {}
        }
        gasReporter.reportToConsole()

        return {
            oldMeh: this.exEnv.meh2016,
            // newMeh: this.exEnv.meh2018,
            mehWrapper: this.mehWrapper,
            referrals: this.referrals,
            owner: this.exEnv.operatorWallet
            }
        }

    // this address is used as 0 referral (not a contract)
    // TODO remove and ask exEnv directly
    getMehAdminAddr() {
        return this.exEnv.mehAdminAddress
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
        let tx = await this.exEnv.meh2016.adminContractSecurity(ZERO_ADDRESS, false, false, false)
        await tx.wait(getConfigNumConfirmations())
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
        
        // charity can go to any referral addess (any of them can withdraw)
        let charityAddress = this.getLastReferral().address
        console.log("Setting charity address:", charityAddress)
        console.log("Setting new delay in seconds:", this.newDelay)
        await this.exEnv.meh2016.adminContractSettings(this.newDelay, charityAddress, 0)
    }

    // will deploy factory. Need unpaused MEH
    async deployReferralFactory() {
        await this.unpauseMeh2016()
        // TODO check if MEH is paused ()
        console.log("Deploying referral factory")
        const referralFactoryFactory = await ethers.getContractFactory("ReferralFactory");
        this.referralFactory = await referralFactoryFactory.deploy(
            this.exEnv.meh2016.address, 
            this.getMehAdminAddr());
        this.constants.add({referralFactoryAddr: this.referralFactory.address})
        await this.pauseMeh2016()
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
        
        let nOfRefs = this.numOfReferrals()
        let currentReferralAddr = this.getMehAdminAddr()
        if (nOfRefs > 0) {
            currentReferralAddr = this.getLastReferral().address
        }
        for (nOfRefs; nOfRefs < NUM_OF_REFERRALS; nOfRefs++) {
          let newRef = await this.setUpReferral(currentReferralAddr)
          this.referrals.push(newRef)
          currentReferralAddr = newRef.address
          if (this.isLiveNetwork) {
            console.log("Live network. Wait for activation time and rerun script")
            break 
          } else { 
            // level shows how far it is from mehAdmin (who is 0)
            await this.exEnv.waitForActivationTime(nOfRefs + 1)
          }
        }
        this.constants.add({referralsAddresses: this.referrals.map(ref => ref.address)})
      }
    
    async pairSingleRefAndWrapper(ref) {
        let setWrapperRec = await (await ref.setWrapper(this.mehWrapper.address)).wait(this.exEnv.numConf)
        let addRefferalRec = await (await this.mehWrapper.addRefferal(ref.address)).wait(this.exEnv.numConf)
        return [setWrapperRec, addRefferalRec]
    }

    // Pairs referrals and wrapper
    async pairRefsAndWrapper() {
        console.log("Registering referrals...")
        // let referralsGas = BigNumber.from(0)
        for (let referral of this.referrals) {
            let receipts = await this.pairSingleRefAndWrapper(referral)
            // referralsGas += receipt.gasUsed
            console.log("Registered ref:", referral.address)
        }
        this.constants.add({areRefsAndWrapperPaired: true})
        this.areRefsAndWrapperPaired = true
        // this.gasReporter.addGasRecord("Registering referrals", referralsGas)
    }

    // DEPLOY WRAPPER
    // wrapper constructor(meh2016address, meh2018address, wethAddress, soloMarginAddress)
    async deployWrapper() {
        console.log("Deploying wrapper(", this.exEnv.meh2016.address, this.exEnv.meh2018.address, this.exEnv.weth.address, this.exEnv.soloMarginAddress, ")")
        // very ugly intrusion here. Using the same code to deploy MinterAdapter for tests
        let wrapperContractName = this.isDeployingMinterAdapter ? "MinterAdapter" : "MehWrapper"
        this.mehWrapper = await deployContract(
            wrapperContractName,
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
    ProjectEnvironment,
    Deployer,
    Constants,
    releaseWrapper,
    setupMocks
}
