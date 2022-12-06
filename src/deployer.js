const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");
const { GasReporter, increaseTimeBy, getConfigChainID } = require("../src/tools.js")
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

async function deployMocks() {
    console.log("Deploying mocks to Chain ID:", getConfigChainID())
    // WETH mock 
    const weth = await deployContract("WETH9", {"isVerbouse": true})

}

// deployer and setup script used in tests and in production too
async function setupTestEnvironment() {
    ;[owner] = await ethers.getSigners()
  
    // deploy wrapper
    // const mehWrapper = await deployWrapperCountGas(gasReporter)
    const mehWrapper = await deployContract("Main", {"isVerbouse": true, "gasReporter": gasReporter})
    
    // FLASHLOAN
    // put more than 2 wei to mehWrapper contract (SoloMargin requirement)
    const weth = new ethers.Contract(wethAddress, wethAbi, owner)
    await weth.deposit({value: 2})
    await weth.transfer(mehWrapper.address, 2)
  
    // REFERRALS
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [mehAdminAddress],
    });
    const mehAdmin = await ethers.getSigner(mehAdminAddress)
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
async function deployContract(contractName, options) {
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
    const contr = await contrFactory.deploy()
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
    deployMocks
}
