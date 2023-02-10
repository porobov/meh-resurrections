const { expect } = require("chai");
const { ethers } = require("hardhat");
const { ProjectEnvironment, Deployer } = require("../src/deployer.js")
const { resetHardhatToBlock, increaseTimeBy } = require("../src/tools.js")
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const { rand1to100, blockID, balancesSnapshot } = require("../src/test-helpers.js")
const conf = require('../conf.js');
const { BigNumber } = require("ethers");

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
      // isDeployingMinterAdapter: true }
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

  it("Sets wrapper address and transfers ownership to it", async function () {
    let referral = await deployer.setUpReferral(mehAdminAddress)
    await expect(referral.connect(stranger).setWrapper(wrapper.address)).to.be.revertedWith(
      "Ownable: caller is not the owner")

    await referral.connect(owner).setWrapper(wrapper.address)
    expect(await referral.wrapper()).to.be.equal(wrapper.address)
    expect(await referral.oldMeh()).to.be.equal(oldMeh.address)
    expect(await referral.owner()).to.be.equal(wrapper.address)
  })

  it("Cannot receive money from strangers", async function () {
    let referral = await deployer.setUpReferral(mehAdminAddress)
    await expect(stranger.sendTransaction({
      to: referral.address,
      value: ethers.utils.parseEther("1.0"),
    })).to.be.revertedWith("Referral: Only receives from oldMEH")
  })

  it("Only wrapper can withdraw from referral", async function () {
    let referral = await deployer.setUpReferral(mehAdminAddress)
    await deployer.unpauseMeh2016()  // bacause setUpReferral pauses contract
    await increaseTimeBy(3600 * 1)  // let 10 hours pass
    let mintingPrice = ethers.utils.parseEther("1.0")
    let referralShare = mintingPrice.div(2)
    let cc = availableAreas[0]

    // sending eth from oldMEh to referral
    await oldMeh.connect(stranger).signIn(referral.address)
    await oldMeh.connect(stranger).buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: mintingPrice })
    let info = await oldMeh.getUserInfo(referral.address)
    expect(info.balance).to.be.equal(referralShare)

    // trying to withdraw by a stranger
    await expect(referral.connect(stranger).withdrawFromMeh()).to.be.revertedWith(
      "Ownable: caller is not the owner")
    await expect(referral.connect(stranger).sendFundsToWrapper()).to.be.revertedWith(
      "Ownable: caller is not the owner")
    await referral.connect(owner).setWrapper(wrapper.address)
    await expect(referral.connect(stranger).withdrawFromMeh()).to.be.revertedWith(
      "Ownable: caller is not the owner")
    await expect(referral.connect(stranger).sendFundsToWrapper()).to.be.revertedWith(
      "Ownable: caller is not the owner")

    // withdraw from meh
    const refBalBefore = await ethers.provider.getBalance(referral.address)
    await wrapper.connect(owner).refWithdrawFromMeh(referral.address)
    const refBalAfter = await ethers.provider.getBalance(referral.address)
    expect(refBalAfter.sub(refBalBefore)).to.be.equal(referralShare)

    // send to wrapper
    const wrapperBalBefore = await ethers.provider.getBalance(wrapper.address)
    await wrapper.connect(owner).refSendFundsToWrapper(referral.address)
    const wrapperBalAfter = await ethers.provider.getBalance(wrapper.address)
    expect(wrapperBalAfter.sub(wrapperBalBefore)).to.be.equal(referralShare)
  })
})

makeSuite("Referrals", function () {

  it("Only wrapper can withdraw from referral", async function () {
    let referral = await deployer.setUpReferral(mehAdminAddress)
    await deployer.unpauseMeh2016()  // bacause setUpReferral pauses contract
    await increaseTimeBy(3600 * 1)  // let 10 hours pass
    let mintingPrice = ethers.utils.parseEther("1.0")
    let referralShare = mintingPrice.div(2)
    let cc = availableAreas[0]

    // sending eth from oldMEh to referral
    await oldMeh.connect(stranger).signIn(referral.address)
    await oldMeh.connect(stranger).buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: mintingPrice })
    let info = await oldMeh.getUserInfo(referral.address)

    // trying to withdraw by a stranger
    await expect(referral.connect(stranger).withdraw()).to.be.revertedWith(
      "Ownable: caller is not the owner")
    await referral.connect(owner).setWrapper(wrapper.address)
    await expect(referral.connect(stranger).withdraw()).to.be.revertedWith(
      "Ownable: caller is not the owner")

    // send to wrapper
    const wrapperBalBefore = await ethers.provider.getBalance(wrapper.address)
    let amount = await wrapper.connect(owner).callStatic.refWithdraw(referral.address)
    await wrapper.connect(owner).refWithdraw(referral.address)
    const wrapperBalAfter = await ethers.provider.getBalance(wrapper.address)
    expect(amount).to.be.equal(referralShare)
    expect(wrapperBalAfter.sub(wrapperBalBefore)).to.be.equal(referralShare)
  })
})