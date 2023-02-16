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
      ;[ownerGlobal, buyer, stranger, notAReferral] = await ethers.getSigners()
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

makeSuite("Collector basic", function () {

  it("Anyone can send funds to Collector", async function () {
      let value = ethers.utils.parseEther("1.0")
      const collectorBalBefore = await ethers.provider.getBalance(wrapper.address)
      await wrapper.connect(stranger).referralPayback({ value: value })
      const collectorBalAfter = await ethers.provider.getBalance(wrapper.address)
      expect(collectorBalAfter.sub(collectorBalBefore)).to.be.equal(value)
    })
  
  // can only add a real referral
  it("Can only add a paired referral", async function () {
    let referral = await deployer.setUpReferral(mehAdminAddress)
    await expect(wrapper.connect(owner).addRefferal(referral.address))
      .to.be.revertedWith("Collector: Referral is not owned by wrapper")
  })

  // note. Can add as many referrals as needed.
  it("Owner (and only owner) can register refferals", async function () {
    let referral = await deployer.setUpReferral(mehAdminAddress)
    await deployer.pairSingleRefAndWrapper(referral)
    // only owner
    await expect(wrapper.connect(stranger).addRefferal(referral.address))
      .to.be.revertedWith("Ownable: caller is not the owner")
    // only real referral
    await expect(wrapper.connect(owner).addRefferal(notAReferral.address))
      .to.be.reverted // reverts with function call to a non-contract account
    await wrapper.connect(owner).addRefferal(referral.address)
    let referralIndex = 0
    expect(await wrapper.referrals(referralIndex)).to.be.equal(referral.address)
  })
})

makeSuite("Chain of referrals", function () {

  // continuity of chain is checked at wrapper sign in (see MehWrapper.sol)
  it("Can register chain of refferals", async function () {
    await deployer.deployReferrals()
    expect(deployer.referrals.length).to.be.equal(conf.NUM_OF_REFERRALS)
    let deplRefsAddrs = deployer.constants.constants.referralsAddresses
    // add referrals
    for (let i in deployer.referrals) {
      await deployer.pairSingleRefAndWrapper(deployer.referrals[i])
    }
    // check
    for (let i in deplRefsAddrs) {
      let contractRef = await wrapper.referrals(i)
      expect(contractRef).to.be.equal(deplRefsAddrs[i])
    }
  })

  it("Cannot add referrals after wrapper signs into oldMeh (using prev. test state)", async function () {
    let referral = await deployer.setUpReferral(mehAdminAddress)
    await deployer.unpauseMeh2016()
    await deployer.mehWrapper.signIn()
    await expect(wrapper.connect(owner).addRefferal(referral.address))
      .to.be.revertedWith("Collector: Cannot add referrals after sign in")
  })
})

makeSuite("Collector withdrawals", function () {

  // the test also shows that internal _withdrawFromReferrals() function works
  it("Admin (and only admin) can withdraw excess funds from referrals", async function () {
    await deployer.deployReferrals()
    await deployer.pairRefsAndWrapper()
    await deployer.unpauseMeh2016()  // bacause setUpReferral pauses contract
    let ref = deployer.referrals[0]

    // send funds by stranger
    let value = ethers.utils.parseEther("1.0")
    await stranger.sendTransaction({
      to: ref.address,
      value: value,
    })
    // stranger withdrawal
    await expect(wrapper.connect(stranger).adminWithdrawFromReferrals())
      .to.be.revertedWith("Ownable: caller is not the owner")
    // owner withdrawal
    const ownerBalBefore = await ethers.provider.getBalance(owner.address)
    const tx = await wrapper.connect(owner).adminWithdrawFromReferrals()
    let totalGas = await getTotalGas([tx])
    const ownerBalAfter = await ethers.provider.getBalance(owner.address)
    expect(ownerBalAfter.sub(ownerBalBefore)).to.be.equal(value.sub(totalGas))
  })
})
