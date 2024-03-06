const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");
const { ProjectEnvironment, Deployer, setupTestEnvironment } = require("../src/deployer.js")
const { resetHardhatToBlock, getImpersonatedSigner, increaseTimeBy } = require("../src/tools.js")
const { blockID, countBlocks } = require("../src/test-helpers.js")
const conf = require('../conf.js');

let availableAreas = [
  {fx: 1, fy: 24, tx: 1, ty: 24}, // single
  {fx: 2, fy: 24, tx: 2, ty: 25}  // range
]
let areas2016 = [
  {fx: 51, fy: 35, tx: 51, ty: 35}, // single
  {fx: 50, fy: 34, tx: 50, ty: 35}, // range
]
let occupiedAreas = [
  {fx: 1, fy: 1, tx: 1, ty: 1}, // single
]
let a = conf.RESERVED_FOR_FOUNDER
let founderAreas = [
  {fx: a.fx, fy: a.fy, tx: a.fx, ty: a.fy}, // single
  {fx: a.fx + 1, fy: a.fy, tx: a.fx + 1, ty: a.fy + 1}  // range (2 blocks)
]
let imageSourceUrl = "imageSourceUrl"
let adUrl = "adUrl"
let adText = "adText"

const MEH_ADMIN_ADDRESS = conf.mehAdminAddress
let deployer

async function testEnvironmentCollector() {
  ;[owner] = await ethers.getSigners()
  const exEnv = new ProjectEnvironment(owner)
  // resetting hardfork (before loading existing env and impersonating admin!!!)
  await resetHardhatToBlock(conf.forkBlock)  // TODO make configurable depending on chain

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
function makeSuite(name, envSetupFunction, tests) {
  describe(name, function () {
    before('setup', async () => {
      ;[ownerGlobal, buyer, stranger] = await ethers.getSigners()
      let env = await envSetupFunction({})
      owner = env.owner
      wrapper = env.mehWrapper
      referrals= env.referrals
      oldMeh = env.oldMeh
    })
      this.timeout(142000)
      tests();
  });
}
makeSuite("Referrals and Sign in", testEnvironmentCollector, function () {

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
    let brokenReferral = await deployer.setUpReferral(MEH_ADMIN_ADDRESS)
    await deployer.pairSingleRefAndWrapper(brokenReferral)
    await deployer.unpauseMeh2016()
    await expect(deployer.mehWrapper.connect(owner).signIn()).to.be.revertedWith(
        "MehWrapper: referrals chain is broken"
    )
  })
})

makeSuite("Normal operation", testEnvironmentCollector, function () {
  it("Wrapper is signing in to oldMeh", async function () {
    // standard wrapper setup
    await deployer.deployReferrals()
    await deployer.pairRefsAndWrapper()
    await deployer.unpauseMeh2016()
    await deployer.mehWrapper.connect(owner).signIn()
    expect(await wrapper.isSignedIn()).to.be.equal(true)
    expect((await oldMeh.getUserInfo(wrapper.address)).referal).to.be.equal(deployer.getLastReferral().target)
  })
})

makeSuite("More referrals than needed", testEnvironmentCollector, function () {
  it("More referrals can be added than needed", async function () {
    // deploying standard chain of referrals
    await deployer.deployReferrals()
    await deployer.pairRefsAndWrapper()
    await deployer.finalMeh2016settings()  // setting new delay (override)

    // add another referral
    let lastReferral = deployer.getLastReferral()
    let additionalRef = await deployer.setUpReferral(lastReferral.target)
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
        .buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: price })
    expect(await wrapper.ownerOf(blockID(cc.fx, cc.fy))).to.equal(buyer.address)
  })
})

it("Wrapper can be paired with correct contracts only", async function () {
  const wrapper = await ethers.getContractFactory("MehWrapper");
  // wrong meh2016
  await expect(wrapper.deploy(
    conf.newMehAddress,
    conf.newMehAddress,
    conf.wethAddress,
    conf.soloMarginAddress,
  )).to.be.revertedWithoutReason()
  // wrong meh2018
  await expect(wrapper.deploy(
    conf.oldMehAddress,
    conf.oldMehAddress,
    conf.wethAddress,
    conf.soloMarginAddress,
  )).to.be.revertedWithoutReason()
  // wrong weth
  await expect(wrapper.deploy(
    conf.oldMehAddress,
    conf.newMehAddress,
    conf.oldMehAddress,
    conf.soloMarginAddress,
  )).to.be.revertedWithoutReason()
  // wrong solo
  await expect(wrapper.deploy(
    conf.oldMehAddress,
    conf.newMehAddress,
    conf.wethAddress,
    conf.oldMehAddress,
  )).to.be.revertedWithoutReason()

})

// can place image to minted block
makeSuite("Placing image", setupTestEnvironment, function () {

  it("Can place image to minted block", async function () {
    // buy area
    let cc = availableAreas[0]
    let price = await wrapper.crowdsalePrice();  // single block 
    await wrapper.connect(buyer)
        .buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: price })
    await expect(wrapper.connect(buyer)
      .placeImage(cc.fx, cc.fy, cc.tx, cc.ty, imageSourceUrl, adUrl, adText))
        .to.emit(oldMeh, "NewImage")
        .withArgs(anyValue, cc.fx, cc.fy, cc.tx, cc.ty, imageSourceUrl, adUrl, adText);
  })

  it("Cannot place image to an occupied or not minted area (prev. test state)", async function () {
    // area is not wrapped 
    let cc = occupiedAreas[0]
    await expect(wrapper.connect(buyer)
      .placeImage(cc.fx, cc.fy, cc.tx, cc.ty, imageSourceUrl, adUrl, adText))
        .to.be.revertedWith("ERC721: invalid token ID")
    cc = availableAreas[0]
    // not a landlord
    await expect(wrapper.connect(stranger)
      .placeImage(cc.fx, cc.fy, cc.tx, cc.ty, imageSourceUrl, adUrl, adText))
        .to.be.revertedWith("MehWrapper: Not a landlord")
  })

  it("Can place image to minted area", async function () {
    // buy area
    let cc = availableAreas[1]
    let price = (await wrapper.crowdsalePrice()).mul(2)  // single block 
    await wrapper.connect(buyer)
        .buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: price })
    await expect(wrapper.connect(buyer)
      .placeImage(cc.fx, cc.fy, cc.tx, cc.ty, imageSourceUrl, adUrl, adText))
        .to.emit(oldMeh, "NewImage")
        .withArgs(anyValue, cc.fx, cc.fy, cc.tx, cc.ty, imageSourceUrl, adUrl, adText);
  })

  it(`Can place image to a wrapped block`, async function () {
    // prepare data
    let w = areas2016[0]
    ;[landlordAddress, u, s] = await oldMeh.getBlockInfo(w.fx, w.fy);
    let landlord = await getImpersonatedSigner(landlordAddress)
    let pricePerBlock = ethers.parseEther("1")
    let blocksCount = countBlocks(w.fx, w.fy, w.tx, w.ty)
    let sellPrice = (pricePerBlock).mul(blocksCount)
    await setBalance(landlord.address, sellPrice.add(ethers.parseEther("2")));
    
    // Transactions to wrap a 2016 block
    await oldMeh.connect(landlord).sellBlocks(w.fx, w.fy, w.tx, w.ty, pricePerBlock)
    await wrapper.connect(landlord).wrap(w.fx, w.fy, w.tx, w.ty, { value: sellPrice })
    await oldMeh.connect(landlord).withdrawAll()

    await expect(wrapper.connect(landlord)
      .placeImage(w.fx, w.fy, w.tx, w.ty, imageSourceUrl, adUrl, adText))
        .to.emit(oldMeh, "NewImage")
        .withArgs(anyValue, w.fx, w.fy, w.tx, w.ty, imageSourceUrl, adUrl, adText);
  })

  for (let cc of founderAreas) {
    it(`Will place images to blocks reserved for founder (${cc.fx}, ${cc.fy}, ${cc.tx}, ${cc.ty})`, async function () {
      // anyone can mint reserved areas for founders
      await wrapper.connect(buyer)
        .mintReserved(cc.fx, cc.fy, cc.tx, cc.ty)
      // setup founder
      let founder = await getImpersonatedSigner(await wrapper.founder())
      let decentlyEarnedEth = ethers.parseEther("1.0")
      await setBalance(founder.address, decentlyEarnedEth)

      await expect(wrapper.connect(founder)
        .placeImage(cc.fx, cc.fy, cc.tx, cc.ty, imageSourceUrl, adUrl, adText))
          .to.emit(oldMeh, "NewImage")
          .withArgs(anyValue, cc.fx, cc.fy, cc.tx, cc.ty, imageSourceUrl, adUrl, adText);
      
      await expect(wrapper.connect(buyer)
        .placeImage(cc.fx, cc.fy, cc.tx, cc.ty, imageSourceUrl, adUrl, adText))
          .to.be.revertedWith("MehWrapper: Not a landlord")
    })
  }
})

// hommage to MEH 2016
makeSuite("Image placement price", setupTestEnvironment, function () {
  it("Place image is payable (as in the original MEH)", async function () {

    // buy area
    let cc = availableAreas[0]
    let price = await wrapper.crowdsalePrice();  // single block 
    await wrapper.connect(buyer)
        .buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: price })

    // setup mehadmin and new image placement price
    let mehAdmin = await getImpersonatedSigner(MEH_ADMIN_ADDRESS)
    let newImagePlacementPriceInWei = ethers.parseEther("1.0")
    // adminContractSettings (newDelayInSeconds, newCharityAddress, newImagePlacementPriceInWei)
    await oldMeh.connect(mehAdmin).adminContractSettings(1, referrals[referrals.length - 1].address, newImagePlacementPriceInWei)

    // try to place image now with no money
    await expect(wrapper.connect(buyer)
      .placeImage(cc.fx, cc.fy, cc.tx, cc.ty, imageSourceUrl, adUrl, adText))
        .to.be.revertedWithoutReason()
    
    let decentlyEarnedEth = ethers.parseEther("1.0")
    await setBalance(mehAdmin.address, decentlyEarnedEth)

    await expect(wrapper.connect(buyer)
      .placeImage(cc.fx, cc.fy, cc.tx, cc.ty, imageSourceUrl, adUrl, adText, { value: newImagePlacementPriceInWei }))
        .to.emit(oldMeh, "NewImage")
        .withArgs(anyValue, cc.fx, cc.fy, cc.tx, cc.ty, imageSourceUrl, adUrl, adText);
  })
})

  // removing this test as this is different from original MEH functionality
  // it("Anyone can place ads to minted areas if not forbidden", async function () {
  //   expect(false).to.be.equal(true)
  // })
  // when landlord places image, access is restricted automatically 
