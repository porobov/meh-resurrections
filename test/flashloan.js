const { expect } = require("chai");
const { ethers } = require("hardhat");
const { blockID, countBlocks } = require("../src/test-helpers.js")
const { setupTestEnvironment } = require("../src/deployer.js")
const conf = require('../conf.js')

const WRAPPER_BLOCK_PRICE = conf.WRAPPER_BLOCK_PRICE
const IS_DEPLOYING_MOCKS = conf.IS_DEPLOYING_MOCKS

async function checkMinting(buyCoords, checkOwnershipCoords) {
  const BC = buyCoords
  const price = WRAPPER_BLOCK_PRICE.mul(countBlocks(BC.fx,BC.fy,BC.tx,BC.ty))

  const mehBalBefore = await ethers.provider.getBalance(oldMeh.address)
  const wrapperBalBefore = await ethers.provider.getBalance(mehWrapper.address)
  const royaltiesBefore = await mehWrapper.royalties()

  // MONEY FLOW CHECK
  // wrapper balance is encreased, meh balance is the same
  const tx = await mehWrapper.connect(buyer).mint(BC.fx,BC.fy,BC.tx,BC.ty,{value: price});
  const mehBalAfter = await ethers.provider.getBalance(oldMeh.address)
  const wrapperBalAfter = await ethers.provider.getBalance(mehWrapper.address)
  expect(wrapperBalAfter.sub(wrapperBalBefore)).to.equal(price)
  expect(mehBalAfter.sub(mehBalBefore)).to.equal(0)
  
  // referrals balances should be zero
  for (const referral of referrals) {
    let mehBal = (await oldMeh.getUserInfo(referral.address)).balance
    let wrapperBal = await ethers.provider.getBalance(referral.address)
    expect(mehBal).to.equal(0)
    expect(wrapperBal).to.equal(0)
    // console.log("Referral: %s, meh-bal: %s, bal: %s", referral.address, mehBal, wrapperBal)
  }

  // royalties are calculated
  const royaltiesAfter = await mehWrapper.royalties()
  expect(royaltiesAfter.sub(royaltiesBefore)).to.equal(price)

  // OWNERSHIP CHECK
  for (const coord of checkOwnershipCoords) {
    expect((await oldMeh.getBlockInfo(coord.x,coord.y)).landlord).to.equal(mehWrapper.address)
    expect(await mehWrapper.ownerOf(blockID(coord.x,coord.y))).to.equal(buyer.address)
  }
}

describe("Flashloan", function () {
  
  this.timeout(142000)
  before('setup', async () => {
    ;[ownerGlobal, buyer] = await ethers.getSigners()
    let env = await setupTestEnvironment({isDeployingMocks: IS_DEPLOYING_MOCKS})
    owner = env.owner
    mehWrapper = env.mehWrapper
    referrals= env.referrals
    oldMeh = env.oldMeh
  })

  it("Allows to buy 1 block", async function () {
    const buyCoords = { fx: 83, fy: 83, tx: 83, ty: 83 }
    const checkOwnershipCoords = [{ x: 83, y: 83 }]
    await checkMinting(buyCoords, checkOwnershipCoords)
  });

  it("Allows to buy range", async function () {
    const buyCoords = { fx: 84, fy: 83, tx: 85, ty: 83 }
    const checkOwnershipCoords = [{ x: 84, y: 83 }, { x: 85, y: 83 }]
    await checkMinting(buyCoords, checkOwnershipCoords)
  });

  it("Allows to buy all", async function () {
  });

  it("Allows to place ads", async function () {
  });
  
});
