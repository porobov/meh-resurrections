const { expect } = require("chai");
const { ethers } = require("hardhat");
const { ProjectEnvironment, Deployer } = require("../src/deployer.js")
const { resetHardhatToBlock } = require("../src/tools.js")

const { rand1to100, blockID, balancesSnapshot } = require("../src/test-helpers.js")
const conf = require('../conf.js');

const oldMehAddress = conf.oldMehAddress
const mehAdminAddress = conf.mehAdminAddress
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
let deployer

async function testEnvironmentReferrals() {
  ;[owner] = await ethers.getSigners()
  const exEnv = new ProjectEnvironment(owner)
  // resetting hardfork (before loading existing env and impersonating admin!!!)
  await resetHardhatToBlock(conf.mainnetBlockWhenMEHWasPaused)  // TODO make configurable depending on chain 
  await exEnv.loadExistingEnvironment()
  deployer = new Deployer(exEnv, {
      isSavingOnDisk: false })
  return await deployer.deployAndSetup()
}

// function to share deployment sequence between blocks of tests
// Solution from here https://stackoverflow.com/a/26111323
function makeSuite(name, tests) {
  describe(name, function () {
    before('setup', async () => {
      ;[ownerGlobal, buyer] = await ethers.getSigners()
      let env = await testEnvironmentReferrals()
      owner = env.owner
      minter = env.mehWrapper
      referrals= env.referrals
      oldMeh = env.oldMeh

      // const UsingToolsAdapter = await ethers.getContractFactory("UsingToolsAdapter");
      // usingToolsAdapter = await UsingToolsAdapter.deploy();
      // await usingToolsAdapter.deployed();

      // founder_address = await minter.founder()
    })
      this.timeout(142000)
      tests();
  });
}

// sets up the whole environment and then create another independent 
// referral factory to test it
let referralFactory
makeSuite("Referrals", function () {

    it("Creates new referral", async function () {
      let referral = await deployer.setUpReferral(mehAdminAddress)
      expect(await referral.wrapper()).to.be.equal(ZERO_ADDRESS)
      expect(await referral.oldMeh()).to.be.equal(oldMeh.address)
      expect(await referral.owner()).to.be.equal(owner.address)
    })

})