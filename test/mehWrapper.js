const { expect } = require("chai");
const { ethers } = require("hardhat");
const { ProjectEnvironment, Deployer } = require("../src/deployer.js")
const { resetHardhatToBlock, increaseTimeBy } = require("../src/tools.js")
const { blockID } = require("../src/test-helpers.js")
const conf = require('../conf.js');

let availableAreas = [
  {fx: 1, fy: 24, tx: 1, ty: 24}, // single
  {fx: 2, fy: 24, tx: 2, ty: 25}  // range
]

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
      ;[ownerGlobal, buyer, stranger] = await ethers.getSigners()
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
})

makeSuite("Normal operation", function () {
  it("Wrapper is signing in to oldMeh", async function () {
    // standard wrapper setup
    await deployer.deployReferrals()
    await deployer.pairRefsAndWrapper()
    await deployer.unpauseMeh2016()
    await deployer.mehWrapper.connect(owner).signIn()
    expect(await wrapper.isSignedIn()).to.be.equal(true)
    expect((await oldMeh.getUserInfo(wrapper.address)).referal).to.be.equal(deployer.getLastReferral().address)
  })
})

makeSuite("More referrals than needed", function () {
  it("More referrals can be added than needed", async function () {
    // deploying standard chain of referrals
    await deployer.deployReferrals()
    await deployer.pairRefsAndWrapper()
    await deployer.finalMeh2016settings()  // setting new delay (override)

    // add another referral
    let lastReferral = deployer.getLastReferral()
    let additionalRef = await deployer.setUpReferral(lastReferral.address)
    await deployer.pairSingleRefAndWrapper(additionalRef)
    await increaseTimeBy(3600 * 1)  // let 10 hours pass
    await deployer.unpauseMeh2016()

    // sign in and finalize wrapper setup
    await deployer.mehWrapper.connect(owner).signIn()
    await deployer.finalMeh2016settings()  // setting charity address
    await deployer.exEnv.weth.deposit({value: 20000})
    await deployer.exEnv.weth.transfer(deployer.mehWrapper.address, 20000)

    // try to buy area
    let cc = availableAreas[0]
    let price = await wrapper.crowdsalePrice();  // single block 
    await wrapper.connect(buyer)
        .mint(cc.fx, cc.fy, cc.tx, cc.ty, { value: price })
    expect(await wrapper.ownerOf(blockID(cc.fx, cc.fy))).to.equal(buyer.address)
  })
})

it("More referrals can be added than needed", async function () {
  const wrapper = await ethers.getContractFactory("MehWrapper");
  // wrong meh2016
  await expect(wrapper.deploy(
    conf.newMehAddress,
    conf.newMehAddress,
    conf.wethAddress,
    conf.soloMarginAddress,
  )).to.be.reverted
  // wrong meh2018
  await expect(wrapper.deploy(
    conf.oldMehAddress,
    conf.oldMehAddress,
    conf.wethAddress,
    conf.soloMarginAddress,
  )).to.be.reverted
  // wrong weth
  await expect(wrapper.deploy(
    conf.oldMehAddress,
    conf.newMehAddress,
    conf.oldMehAddress,
    conf.soloMarginAddress,
  )).to.be.reverted
  // wrong solo
  await expect(wrapper.deploy(
    conf.oldMehAddress,
    conf.newMehAddress,
    conf.wethAddress,
    conf.oldMehAddress,
  )).to.be.reverted

})