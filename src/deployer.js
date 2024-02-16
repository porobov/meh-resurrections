const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const { ethers } = require("hardhat")
const { BigNumber } = require("ethers")
const { GasReporter, increaseTimeBy, getConfigChainID, getConfigNumConfirmations, getImpersonatedSigner, resetHardhatToBlock, isLocalTestnet, isLiveNetwork, isForkedMainnet, getFormattedBalance } = require("../src/tools.js")
const conf = require('../conf.js')
const { concat } = require('ethers/lib/utils.js')
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");

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
const IS_VERBOUSE = !(!conf.IS_VERBOUSE_TEST && isLocalTestnet());

// deployer and setup script used in tests
// will setup referrals, deploy and setup wrapper
// ensures all contracts are in clean state either by fork or redeploying
async function setupTestEnvironment(options) {
    let isDeployingMinterAdapter = ("isDeployingMinterAdapter" in options) ? options.isDeployingMinterAdapter: false
    let isDeployingMocksForTets = ("isDeployingMocksForTets" in options) ? options.isDeployingMocksForTets : false

    ;[owner] = await ethers.getSigners()
    const exEnv = new ProjectEnvironment(owner)

    // reset fork or redeploy mocks
    if (isDeployingMocksForTets) {
        await exEnv.deployMocks(false)  // not saving mocks on disk
    } else {
        // resetting hardfork (before loading existing env and impersonating admin!!!)
        await resetHardhatToBlock(conf.forkBlock)  // TODO make configurable depending on chain 
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
        this.mockAddressesJSON = {}
        this.mocksPath = this.getMocksPath(this.chainID)
        this.isLocalTestnet = isLocalTestnet()
        this.operatorWallet = operatorWallet
        this.referralActivationTime = 3600

        this.soloMarginAddress
        this.mehAdminAddress
        this.meh2018
        this.meh2016
        this.weth

        this.isInitialized = false
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
        // check if we are on a fork
        if (isForkedMainnet()) {
            // actually forking will take place on local testnet as well if we run npx hardhat node
            console.log(chalk.green("Forked mainnet"))
            return realAddresses["1"]
        } else {
            console.log(chalk.green("Not hardhat network"))
            return realAddresses?.[chainID] || {}
        }
    }

    // deploy mocks to a testnet (local or remote)
    // mocks were needed to extensively test smart contracts when reaching Alchemy limits
    // mocks are also needed to test on a testNet
    // WARNING!!! Will deploy necessary mocks only. Will check existing 
    // WETH and flash loan contracts on a network
    async deployMocks(isSavingToDisk = false) {
        if ( getConfigChainID() == 1) { throw ("Cannot use mocks on mainnet!") }
        // ;[owner] = await ethers.getSigners()
        const owner = this.operatorWallet
        IS_VERBOUSE ? console.log(
            chalk.red("DEPLOYING MOCKS TO CHAIN ID:"), getConfigChainID(), 
            "\nConfirmations:", getConfigNumConfirmations(),
            "\nDeploying from address:", owner.address) : null

        // Loan platform and WETH mocks
        // Will not deploy if got mocks on chain (e.g. goerli)
          
        if (!this.realAddressesJSON.weth && !this.realAddressesJSON.soloMargin) {
            this.weth = await deployContract("WETH9", { "isVerbouse": IS_VERBOUSE })
            this.soloMargin = await deployContract("BalancerVaultMock", { "isVerbouse": IS_VERBOUSE }, this.weth.address)
            this.soloMarginAddress = this.soloMargin.address
            // sending ETH to weth mock
            // Flashloaner contract will use this eth to buy from OldMEH
            // It converts weth from solomargin to eth (and then back)
            // the cost of a block in meh2016 mock is 1 gwei
            const SOLO_WETH_POOL_SIZE = ethers.utils.parseUnits("16001", "ether")
            await setBalance(this.weth.address, SOLO_WETH_POOL_SIZE)
            // minting weth to soloMargin
            // Solomargin needs a pool of weth to issue loans
            // Ammount is 1 weth higher than in flashloaner.js test
            await this.weth.mintTo(this.soloMargin.address, SOLO_WETH_POOL_SIZE)
            console.log(chalk.green('Deployed WETH and Loan Platform'))
            console.log(chalk.green("weth", await getFormattedBalance(this.weth.address)))
            console.log(chalk.green("soloMargin", await getFormattedBalance(this.soloMargin.address)))
        }

        // MEHs mocks (will not deploy for mainnet)
        // note that we are using Mocked version of MEH here!!! 
        // see the way it differs from the original
        if (!this.realAddressesJSON.meh2016 && !this.realAddressesJSON.meh2018) {
            this.meh2016 = await deployContract("MillionEtherMock", { "isVerbouse": IS_VERBOUSE })
            this.meh2018 = await deployContract("Meh2018Mock", { "isVerbouse": IS_VERBOUSE })
            this.mehAdminAddress = owner.address
            console.log(chalk.green('Deployed MEHs (OldMeh may differ from the original).'))
        }

        // only save existing addresses
        this.mockAddressesJSON = {
            ...(this?.mehAdminAddress && { 'mehAdminAddress': this.mehAdminAddress }),
            ...(this?.weth && { 'weth': this?.weth.address }),
            ...(this?.soloMargin && { 'soloMargin': this.soloMargin.address }),
            ...(this?.meh2016 && { 'meh2016': this.meh2016.address }),
            ...(this?.meh2018 && { 'meh2018': this.meh2018.address }), 
        }

        if (isSavingToDisk) { this.saveExistingEnvironment(this.mockAddressesJSON)}
        return this.mockAddressesJSON
    }

    saveExistingEnvironment(json) {
        fs.writeFileSync(this.mocksPath, JSON.stringify(json, null, 2))
        console.log('Wrote mocks addresses for chainID:', this.chainID, this.mocksPath)
        }

    // see comments on the ProjectEnvironment class
    async initEnv() {
        if (this.isInitialized) { return }

        // TRY LOADING MOCKS FROM DISK (IF NOT LOADED ALREADY)
        if (Object.keys(this.mockAddressesJSON).length === 0) {
            try {
                this.mockAddressesJSON = JSON.parse(fs.readFileSync(this.mocksPath))
                IS_VERBOUSE ? console.log(chalk.red('Loaded mock addresses for chainID: ' + this.chainID)) : null
            } catch (err) {
                IS_VERBOUSE ? console.log(chalk.green("No mocks found. Using real addresses.")) : null
            }
            if (!this.mockAddressesJSON && !isForkedMainnet() && isLocalTestnet()) {
                throw("No mocks and no forked mainnet for local tests")
            }
        }

        // OVERWRITE REAL ADDRESSES WITH MOCKS(IF PRESENT)
        // deployMocks will not create mocks if there are real addresses present in the constants or in config
        // mainnet and testnets (goerli)
        let addressesJSON = {...this.realAddressesJSON, ...this.mockAddressesJSON}
        IS_VERBOUSE ? console.log(addressesJSON) : null
        
        // LOAD MEH ADMIN
        // only needed for MEH and referrals
        let mehAdmin
        // current operator wallet must be the same as the one who deployed mocks
        // ...or the real MEH admin when implementing to the main net
        if (addressesJSON?.mehAdminAddress == this.operatorWallet.address) {
            mehAdmin = this.operatorWallet
            IS_VERBOUSE ? console.log(chalk.green('Loaded mehAdmin:', mehAdmin.address)) : null
        } else {
            if (getConfigChainID() == '1') {
                throw('Must be real Meh admin when releasing to the mainnet')
            } else {
                IS_VERBOUSE ? console.log("Impersonating admin...") : null
                mehAdmin = await getImpersonatedSigner(addressesJSON.mehAdminAddress)
            }
        }

        // INIT CONTRACTS (only the ones that are not init yet)
        this.meh2018 = !this.meh2018 ? new ethers.Contract(addressesJSON.meh2018, newMehAbi, this.operatorWallet) : this.meh2018
        this.meh2016 = !this.meh2016 ? new ethers.Contract(addressesJSON.meh2016, oldMehAbi, mehAdmin) : this.meh2016
        this.weth = !this.weth ? await ethers.getContractAt("WETH9", addressesJSON.weth) : this.weth
        this.soloMarginAddress = !this.soloMarginAddress ? addressesJSON.soloMargin : this.soloMarginAddress
        this.mehAdminAddress = await mehAdmin.getAddress()

        this.isInitialized = true
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
            IS_VERBOUSE ? console.log(chalk.red("Loaded infrastructure smart contracts from constants for chain id"), chainID) : null
        } catch (err) {
            this.constants = {}
            // no refFactory, no refs, no wrapper
            IS_VERBOUSE ? console.log(chalk.green("Not a single wrapper infrastructure smart contract on chain id"), chainID) : null
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
        this.exEnv = existingEnvironment
        this.constants = new Constants(getConfigChainID())
    }

    // will initialize and load previous state
    async initialize(){
        await this.exEnv.initEnv()  // project env
        await this.loadConstants()  // already deployed wrapper infra
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
                await this.deployReferralFactory() : null

            if (this.referralFactory && (this.numOfReferrals() < NUM_OF_REFERRALS)){
                await this.deployReferrals()}
            
            if ((this.numOfReferrals() >= NUM_OF_REFERRALS) && !this.mehWrapper) {   
                await this.deployWrapper()}

            if (this.mehWrapper && !this.areRefsAndWrapperPaired){
                await this.pairRefsAndWrapper()}

            if (this.areRefsAndWrapperPaired) {
                // wrapper signs in to old meh
                await this.unpauseMeh2016()
                let mehWrapperSignInTx = await this.mehWrapper.signIn()  // TODO wait for confirmations
                IS_VERBOUSE ? console.log(chalk.gray("Meh wrapper signs in. Tx:", mehWrapperSignInTx?.hash)) : null
                await mehWrapperSignInTx.wait(getConfigNumConfirmations())
                
                // setting charity address and NEW_DELAY
                await this.finalMeh2016settings()
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
            // always saving constants for live networks 
            this.isSavingOnDisk || isLiveNetwork() ? 
                this.constants.save(getConfigChainID()) : null
        }
        IS_VERBOUSE ? gasReporter.reportToConsole() : null

        return {
            oldMeh: this.exEnv.meh2016,
            // newMeh: this.exEnv.meh2018,
            mehWrapper: this.mehWrapper,
            referrals: this.referrals,
            owner: this.exEnv.operatorWallet,
            mehAdminAddress: this.exEnv.mehAdminAddress
            }
        }

    // this address is used as 0 referral (not a contract)
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
        IS_VERBOUSE ? console.log(chalk.gray("Unpausing meh. Tx:", tx?.hash)) : null
        let receipt = await tx.wait(getConfigNumConfirmations())
        let gotReceipt = receipt ? true : false;
        (IS_VERBOUSE && gotReceipt) ? console.log("MEH unpaused...") : null;
        return gotReceipt
    }

    async pauseMeh2016() {
        let tx = await this.exEnv.meh2016.adminContractSecurity(ZERO_ADDRESS, false, true, false)
        IS_VERBOUSE ? console.log(chalk.gray("Pausing meh. Tx:", tx?.hash)) : null
        let receipt = await tx.wait(getConfigNumConfirmations())
        let gotReceipt = receipt ? true : false;
        (IS_VERBOUSE && gotReceipt) ? console.log("MEH paused...") : null
        return gotReceipt
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
        let tx = await this.exEnv.meh2016.adminContractSettings(this.newDelay, charityAddress, 0)
        IS_VERBOUSE ? console.log(chalk.gray("Admin contract settings tx:", tx?.hash)) : null
        let receipt = await tx.wait(getConfigNumConfirmations())
        if (receipt) {
            IS_VERBOUSE ? console.log("Charity address is set:", charityAddress) : null
            IS_VERBOUSE ? console.log("New delay in seconds is set:", this.newDelay) : null
        }
    }

    // will deploy factory. Need unpaused MEH
    async deployReferralFactory() {
        await this.unpauseMeh2016()
        // TODO check if MEH is paused ()
        const referralFactoryFactory = await ethers.getContractFactory("ReferralFactory");
        this.referralFactory = await referralFactoryFactory.deploy(
            this.exEnv.meh2016.address, 
            this.getMehAdminAddr());
        this.constants.add({referralFactoryAddr: this.referralFactory.address})
        if (await this.pauseMeh2016()) {
            IS_VERBOUSE ? console.log("Deployed referral factory") : null
        }
    }

    async setUpReferral(referralAddress) {
        await this.unpauseMeh2016()
        const tx = await this.referralFactory.createReferral(this.exEnv.meh2016.address, referralAddress)
        IS_VERBOUSE ? console.log(chalk.gray("Deploying referral. Tx:", tx?.hash)) : null
        const reciept = await tx.wait(this.exEnv.numConf)
        const blockNumber = reciept.blockNumber
        const eventFilter = this.referralFactory.filters.NewReferral()
        const events = await this.referralFactory.queryFilter(eventFilter, blockNumber, blockNumber)
        const newRefAddress = events[0].args.newReferralAddr
        const refGasUsed = reciept.gasUsed;
        const referral = await ethers.getContractAt("Referral", newRefAddress)
        // this.gasReporter.addGasRecord("Referrals", refGasUsed)
        IS_VERBOUSE ? console.log("Deployed referral:", referral.address) : null
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
          if (isLiveNetwork()) {
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
        let setWrapperTx = await ref.setWrapper(this.mehWrapper.address)
        IS_VERBOUSE ? console.log(chalk.gray(`Setting wrapper for ref ${ref.address}. Tx ${setWrapperTx?.hash}`)) : null
        let setWrapperRec = await setWrapperTx.wait(this.exEnv.numConf)
        let addRefferalTx = await this.mehWrapper.addRefferal(ref.address)
        IS_VERBOUSE ? console.log(chalk.gray(`Registering referral in wrapper ${ref.address}. Tx ${addRefferalTx?.hash}`)) : null
        let addRefferalRec = await addRefferalTx.wait(this.exEnv.numConf)
        return [setWrapperRec, addRefferalRec]
    }

    // Pairs referrals and wrapper
    async pairRefsAndWrapper() {
        IS_VERBOUSE ? console.log("Registering referrals...") : null
        // let referralsGas = BigNumber.from(0)
        for (let referral of this.referrals) {
            let receipts = await this.pairSingleRefAndWrapper(referral)
            // referralsGas += receipt.gasUsed
            IS_VERBOUSE ? console.log("Registered ref:", referral.address) : null
        }
        this.constants.add({areRefsAndWrapperPaired: true})
        this.areRefsAndWrapperPaired = true
        // this.gasReporter.addGasRecord("Registering referrals", referralsGas)
    }

    // DEPLOY WRAPPER
    // wrapper constructor(meh2016address, meh2018address, wethAddress, soloMarginAddress)
    async deployWrapper() {
        IS_VERBOUSE ? console.log("Deploying wrapper(", this.exEnv.meh2016.address, this.exEnv.meh2018.address, this.exEnv.weth.address, this.exEnv.soloMarginAddress, ")") : null
        // very ugly intrusion here. Using the same code to deploy MinterAdapter for tests
        let wrapperContractName = this.isDeployingMinterAdapter ? "MinterAdapter" : "MehWrapper"
        this.mehWrapper = await deployContract(
            wrapperContractName,
            {"isVerbouse": IS_VERBOUSE, "gasReporter": gasReporter},
            this.exEnv.meh2016.address,
            this.exEnv.meh2018.address,
            this.exEnv.weth.address,
            this.exEnv.soloMarginAddress,
        )
        IS_VERBOUSE ? console.log("MehWrapper deployed to:", this.mehWrapper.address) : null
        this.constants.add({ wrapperAddresses: this.mehWrapper.address })
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
    isVerbouse ? console.log(chalk.gray(`Deploying ${contractName} Tx: ${contr?.deployTransaction?.hash}`)) : null
    const reciept = await contr.deployTransaction.wait(getConfigNumConfirmations())
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
    setupMocks,
}
