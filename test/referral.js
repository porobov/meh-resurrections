const { expect } = require("chai");
const { ethers } = require("hardhat");
const { ProjectEnvironment, Deployer } = require("../src/deployer.js")
const { resetHardhatToBlock, increaseTimeBy } = require("../src/tools.js")
const conf = require('../conf.js');

let mehAdminAddress
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
let deployer

let availableAreas = [
  {fx: 1, fy: 24, tx: 1, ty: 24}, // single
  {fx: 2, fy: 24, tx: 2, ty: 25}  // range
]

async function testEnvironmentReferrals() {
  ;[owner] = await ethers.getSigners()

  !conf.IS_DEPLOYING_MOCKS_FOR_TESTS ? await resetHardhatToBlock(conf.forkBlock) : null // TODO make configurable depending on chain
  const exEnv = new ProjectEnvironment(owner)
  conf.IS_DEPLOYING_MOCKS_FOR_TESTS ? await exEnv.deployMocks() : null

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
      ;[ownerGlobal, stranger] = await ethers.getSigners()
      let env = await testEnvironmentReferrals()
      owner = env.owner
      wrapper = env.mehWrapper
      referrals= env.referrals
      oldMeh = env.oldMeh
      mehAdminAddress = env.mehAdminAddress
    })
      this.timeout(142000)
      tests();
  });
}

// sets up the whole environment and then create another independent
// referral factory to test it
let referralFactory

makeSuite("Referrals setup", function () {

  it("Creates new referral", async function () {
    let referral = await deployer.setUpReferral(mehAdminAddress)
    expect(await referral.wrapper()).to.be.equal(ZERO_ADDRESS)
    expect(await referral.oldMeh()).to.be.equal(oldMeh.target)
    expect(await referral.owner()).to.be.equal(owner.address)
  })

  it("Sets wrapper address and transfers ownership to it", async function () {
    let referral = await deployer.setUpReferral(mehAdminAddress)
    await expect(referral.connect(stranger).setWrapper(wrapper.target)).to.be.revertedWith(
      "Ownable: caller is not the owner")

    await referral.connect(owner).setWrapper(wrapper.target)
    expect(await referral.wrapper()).to.be.equal(wrapper.target)
    expect(await referral.oldMeh()).to.be.equal(oldMeh.target)
    expect(await referral.owner()).to.be.equal(wrapper.target)
  })

  // removed this test. See below ↓↓↓
  // it("Cannot receive money from strangers", async function () {
  //   let referral = await deployer.setUpReferral(mehAdminAddress)
  //   await expect(stranger.sendTransaction({
  //     to: referral.target,
  //     value: ethers.parseEther("1.0"),
  //   })).to.be.revertedWith("Referral: Only receives from oldMEH")
  // })

  // Minter.sol can handle excess funds anyway. Plus there's any referral can 
  // receive money through somebody's self-destruct. 
  // Plus Collector doesn't check sender (Minter.sol can receive money through
  // referral payback function). So there's no necessity in checking sender here
  it("Can receive money from strangers", async function () {
    let referral = await deployer.setUpReferral(mehAdminAddress)
    let value = ethers.parseEther("1.0")
    const refBalBefore = await ethers.provider.getBalance(referral.target)
    await stranger.sendTransaction({
      to: referral.target,
      value: value,
    })
    const refBalAfter = await ethers.provider.getBalance(referral.target)
    expect(refBalAfter - (refBalBefore)).to.be.equal(value)
  })

  it("Only wrapper can withdraw from referral (separate functions)", async function () {
    let referral = await deployer.setUpReferral(mehAdminAddress)
    await deployer.unpauseMeh2016()  // bacause setUpReferral pauses contract
    await increaseTimeBy(3600 * 1)  // let 10 hours pass
    let mintingPrice = ethers.parseEther("1.0")
    let referralShare = mintingPrice / (2n)
    let cc = availableAreas[0]

    // sending eth from oldMEh to referral
    await oldMeh.connect(stranger).signIn(referral.target)
    await oldMeh.connect(stranger).buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: mintingPrice })
    let info = await oldMeh.getUserInfo(referral.target)
    expect(info.balance).to.be.equal(referralShare)

    // trying to withdraw by a stranger
    await expect(referral.connect(stranger).withdrawFromMeh()).to.be.revertedWith(
      "Ownable: caller is not the owner")
    await expect(referral.connect(stranger).sendFundsToWrapper()).to.be.revertedWith(
      "Ownable: caller is not the owner")
    await referral.connect(owner).setWrapper(wrapper.target)
    await expect(referral.connect(stranger).withdrawFromMeh()).to.be.revertedWith(
      "Ownable: caller is not the owner")
    await expect(referral.connect(stranger).sendFundsToWrapper()).to.be.revertedWith(
      "Ownable: caller is not the owner")

    // withdraw from meh
    const refBalBefore = await ethers.provider.getBalance(referral.target)
    await wrapper.connect(owner).refWithdrawFromMeh(referral.target)
    const refBalAfter = await ethers.provider.getBalance(referral.target)
    expect(refBalAfter - (refBalBefore)).to.be.equal(referralShare)

    // send to wrapper
    const wrapperBalBefore = await ethers.provider.getBalance(wrapper.target)
    await wrapper.connect(owner).refSendFundsToWrapper(referral.target)
    const wrapperBalAfter = await ethers.provider.getBalance(wrapper.target)
    expect(wrapperBalAfter - (wrapperBalBefore)).to.be.equal(referralShare)
  })
})

makeSuite("Referrals withdrawal", function () {

  it("Only wrapper can withdraw from referral (single withdraw function)", async function () {
    let referral = await deployer.setUpReferral(mehAdminAddress)
    await deployer.unpauseMeh2016()  // bacause setUpReferral pauses contract
    await increaseTimeBy(3600 * 1)  // let 10 hours pass
    let mintingPrice = ethers.parseEther("1.0")
    let referralShare = mintingPrice / (2n)
    let cc = availableAreas[0]

    // sending eth from oldMEh to referral
    await oldMeh.connect(stranger).signIn(referral.target)
    await oldMeh.connect(stranger).buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: mintingPrice })
    let info = await oldMeh.getUserInfo(referral.target)

    // trying to withdraw by a stranger
    await expect(referral.connect(stranger).withdraw()).to.be.revertedWith(
      "Ownable: caller is not the owner")
    await referral.connect(owner).setWrapper(wrapper.target)
    await expect(referral.connect(stranger).withdraw()).to.be.revertedWith(
      "Ownable: caller is not the owner")

    // send to wrapper
    const wrapperBalBefore = await ethers.provider.getBalance(wrapper.target)
    let amount = await wrapper.connect(owner).refWithdraw.staticCall(referral.target)
    await wrapper.connect(owner).refWithdraw(referral.target)
    const wrapperBalAfter = await ethers.provider.getBalance(wrapper.target)
    expect(amount).to.be.equal(referralShare)
    expect(wrapperBalAfter - (wrapperBalBefore)).to.be.equal(referralShare)
  })
})