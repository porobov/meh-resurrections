const { expect } = require("chai");
const { ethers } = require("hardhat");
const { ProjectEnvironment, Deployer } = require("../src/deployer.js")
const { resetHardhatToBlock, increaseTimeBy } = require("../src/tools.js")
const { balancesSnapshot, getTotalGas } = require("../src/test-helpers.js")
const conf = require('../conf.js');


const oldMehAddress = conf.oldMehAddress
const mehAdminAddress = conf.mehAdminAddress
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
let deployer

let availableAreas = [
  {fx: 1, fy: 24, tx: 1, ty: 24}, // single
  {fx: 2, fy: 24, tx: 2, ty: 25}  // range
]

async function testEnvironmentReferrals() {
  ;[owner] = await ethers.getSigners()
  const exEnv = new ProjectEnvironment(owner)
  // resetting hardfork (before loading existing env and impersonating admin!!!)
  await resetHardhatToBlock(conf.mainnetBlockWhenMEHWasPaused)  // TODO make configurable depending on chain
  await exEnv.loadExistingEnvironment()
  deployer = new Deployer(exEnv, {
      isSavingOnDisk: false,
      isDeployingMinterAdapter: true,
      overrideDelay: 1 })  // removing delay
  return await deployer.deployAndSetup()
}

// function to share deployment sequence between blocks of tests
// Solution from here https://stackoverflow.com/a/26111323
function makeSuite(name, tests) {
  describe(name, function () {
    before('setup', async () => {
      ;[ownerGlobal, stranger, notAReferral] = await ethers.getSigners()
      let env = await testEnvironmentReferrals()
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

  // note. Can add as many referrals as needed.
  // Collector will use only the last 6. 
  it("Owner can register refferals", async function () {
    let referral = await deployer.setUpReferral(mehAdminAddress)
    // only owner
    await expect(wrapper.connect(stranger).addRefferal(referral.address))
      .to.be.revertedWith("Ownable: caller is not the owner")
    // only real referral
    await expect(wrapper.connect(owner).addRefferal(notAReferral.address))
      .to.be.reverted // reverts with function call to a non-contract account
    await wrapper.connect(owner).addRefferal(referral.address)
    // ↓↓↓ NUM_OF_REFERRALS == referrals array length 
    expect(await wrapper.referrals(conf.NUM_OF_REFERRALS)).to.be.equal(referral.address)
  })
})

makeSuite("Collector withdrawals", function () {
  it("Admin (and only admin) can withdraw excess funds from referrals", async function () {
    let referral = await deployer.setUpReferral(mehAdminAddress)
    await referral.connect(owner).setWrapper(wrapper.address)
    await wrapper.connect(owner).addRefferal(referral.address)
    await deployer.unpauseMeh2016()  // bacause setUpReferral pauses contract
    // send funds by stranger
    let value = ethers.utils.parseEther("1.0")
    await stranger.sendTransaction({
      to: referral.address,
      value: value,
    })
    // stranger
    await expect(wrapper.connect(stranger).adminWithdrawFromReferrals())
      .to.be.revertedWith("Ownable: caller is not the owner")
    // owner
    const ownerBalBefore = await ethers.provider.getBalance(owner.address)
    const tx = await wrapper.connect(owner).adminWithdrawFromReferrals()
    let totalGas = await getTotalGas([tx])
    const ownerBalAfter = await ethers.provider.getBalance(owner.address)
    expect(ownerBalAfter.sub(ownerBalBefore)).to.be.equal(value.sub(totalGas))
  })
})
/// >>> I'm here <<<< TODO
// collector can withdraw from referrals