const { expect } = require("chai");
const { ethers } = require("hardhat");
const { getFormattedBalance } = require("../src/tools.js")
const { setupTestEnvironment } = require("../src/deployer.js")
const WRAPPER_BLOCK_PRICE = ethers.utils.parseEther("0.25")

function blockID(x, y) {
  return (y - 1) * 100 + x;
}

describe("Flashloan", function () {
  
  this.timeout(142000)
  before('setup', async () => {
    ;[ownerGlobal, buyer] = await ethers.getSigners()
    let env = await setupTestEnvironment(false)
    owner = env.owner
    mehWrapper = env.mehWrapper
    referrals= env.referrals
    oldMeh = env.oldMeh
  })

  // console.log("charity internal meh balance:", ethers.utils.formatEther((await oldMeh.getUserInfo(referrals[0].address)).balance))
  // console.log("charity referral balance:", await getFormattedBalance(referrals[0].address))

  it("Setup is correct", async function () {
    console.log("charityAddress:", await oldMeh.charityAddress())
  })

  it("Doesn't allow to mint reserved, already minted, etc...", async function () {
  })

  it("Check coords to tokenID conversion", async function () {
  })

  it("Allows to buy 1 block", async function () {
    const B = { x: 83, y: 83 }
    const mehBalBefore = await ethers.provider.getBalance(oldMeh.address)
    const wrapperBalBefore = await ethers.provider.getBalance(mehWrapper.address)
    const royaltiesBefore = await mehWrapper.royalties()

    // MONEY FLOW CHECK
    // wrapper balance is encreased, meh balance is the same
    const tx = await mehWrapper.connect(buyer).mint(B.x,B.y,B.x,B.y,{value: WRAPPER_BLOCK_PRICE});
    const mehBalAfter = await ethers.provider.getBalance(oldMeh.address)
    const wrapperBalAfter = await ethers.provider.getBalance(mehWrapper.address)
    expect(wrapperBalAfter.sub(wrapperBalBefore)).to.equal(WRAPPER_BLOCK_PRICE)
    expect(mehBalAfter.sub(mehBalBefore)).to.equal(0)
    
    // referrals balances should be zero
    for (const referral of referrals) {
      let mehBal = (await oldMeh.getUserInfo(referral.address)).balance
      let wrapperBal = await ethers.provider.getBalance(referral.address)
      expect(mehBal).to.equal(0)
      expect(wrapperBal).to.equal(0)
      console.log("Referral: %s, meh-bal: %s, bal: %s", referral.address, mehBal, wrapperBal)
    }

    // royalties are calculated
    const royaltiesAfter = await mehWrapper.royalties()
    expect(royaltiesAfter.sub(royaltiesBefore)).to.equal(WRAPPER_BLOCK_PRICE)

    // OWNERSHIP CHECK
    expect((await oldMeh.getBlockInfo(B.x,B.y)).landlord).to.equal(mehWrapper.address)
    expect(await mehWrapper.ownerOf(blockID(B.x,B.y))).to.equal(buyer.address)
  });
  
});
