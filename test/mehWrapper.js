const { expect } = require("chai");
const { ethers } = require("hardhat");
const { ProjectEnvironment, Deployer } = require("../src/deployer.js")
const { resetHardhatToBlock } = require("../src/tools.js")
const { getTotalGas } = require("../src/test-helpers.js")
const conf = require('../conf.js');

const mehAdminAddress = conf.mehAdminAddress
let deployer

async function testEnvironmentCollector() {
  ;[owner] = await ethers.getSigners()
  const exEnv = new ProjectEnvironment(owner)
  // resetting hardfork (before loading existing env and impersonating admin!!!)
  await resetHardhatToBlock(conf.mainnetBlockWhenMEHWasPaused)  // TODO make configurable depending on chain
  await exEnv.loadExistingEnvironment()

  deployer = new Deployer(exEnv, {
      isSavingOnDisk: false,
      isDeployingMinterAdapter: true,
      overrideDelay: 1 })  // removing delay

  // same as deploy and setup function, but not finalized 
  await deployer.initialize()
  await deployer.deployReferralFactory()
  // await deployer.deployReferrals()
  await deployer.deployWrapper()
  await deployer.unpauseMeh2016()
  // await deployer.pairRefsAndWrapper()
  // await deployer.mehWrapper.signIn()
  // await deployer.finalMeh2016settings()
  // await deployer.exEnv.weth.deposit({value: 20000})
  // await deployer.exEnv.weth.transfer(deployer.mehWrapper.address, 20000)

  return {
      oldMeh: deployer.exEnv.meh2016,
      mehWrapper: deployer.mehWrapper,
      referrals: deployer.referrals,
      owner: deployer.exEnv.operatorWallet
      }
}

// function to share deployment sequence between blocks of tests
// Solution from here https://stackoverflow.com/a/26111323
function makeSuite(name, tests) {
  describe(name, function () {
    before('setup', async () => {
      ;[ownerGlobal, stranger] = await ethers.getSigners()
      let env = await testEnvironmentCollector()
      owner = env.owner
      wrapper = env.mehWrapper
      referrals= env.referrals
      oldMeh = env.oldMeh
    })
      this.timeout(142000)
      tests();
  });
}



makeSuite("Referrals and Sign in", function () {

  it("Only owner can sign in", async function () {
    await expect(deployer.mehWrapper.connect(stranger).signIn()).to.be.revertedWith(
        "Ownable: caller is not the owner"
    )
  })
  
  it("Cannot sign in if chain of refferals is too short", async function () {
    // create all referrals
    await deployer.deployReferrals()
    // pairing less referrals than needed
    for (let i in deployer.referrals) {
      if (i == 5) { break }  
      await deployer.pairSingleRefAndWrapper(deployer.referrals[i])
    }
    await deployer.unpauseMeh2016()
    await expect(deployer.mehWrapper.connect(owner).signIn()).to.be.revertedWith(
        "MehWrapper: not enough referrals"
    )
  })

  // continuity of chain is checked at wrapper sign in (see MehWrapper.sol)
  it("Cannot sign in if chain of refferals is broken (using prev. test state)", async function () {
    // last referral is a referral of mehAdminAddress - not of referral # 5
    let brokenReferral = await deployer.setUpReferral(mehAdminAddress)
    await deployer.pairSingleRefAndWrapper(brokenReferral)
    await deployer.unpauseMeh2016()
    await expect(deployer.mehWrapper.connect(owner).signIn()).to.be.revertedWith(
        "MehWrapper: referrals chain is broken"
    )
  })

  // check if more referrals can be added than needed
 
})
