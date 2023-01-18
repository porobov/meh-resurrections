const { expect } = require("chai");
const { ethers } = require("hardhat");
const { getBalance, getFormattedBalance } = require("../src/tools.js")
const { setupTestEnvironment } = require("../src/deployer.js")
const WRAPPER_BLOCK_PRICE = ethers.utils.parseEther("0.25")
describe("Flashloan", function () {
  this.timeout(142000)
  before('setup', async () => {
    let env = await setupTestEnvironment(false)
    owner = env.owner
    mehWrapper = env.mehWrapper
    referrals= env.referrals
    oldMeh = env.oldMeh
  })

  it("Setup is correct", async function () {
    console.log("charityAddress:", await oldMeh.charityAddress())
  })
  it("Buying 1 block", async function () {
    
    console.log("owner balance:", await getFormattedBalance(owner.address))
    console.log("meh balance:", await getFormattedBalance(oldMeh.address))
    console.log("charity internal meh balance:", ethers.utils.formatEther((await oldMeh.getUserInfo(referrals[0].address)).balance))
    console.log("charity referral balance:", await getFormattedBalance(referrals[0].address))
    
    
    const wrapperBalBefore = await ethers.provider.getBalance(mehWrapper.address)
    // buy blocks
    // now wrapper can buy blocks for free 
    // as it collects all the revenue from referrals and charity
    const tx = await mehWrapper.connect(owner).mint(83,83,83,83,{value: WRAPPER_BLOCK_PRICE});
    // const receipt = await tx.wait(1)  // TODO look for these wait() expressions
    const wrapperBalAfter = await ethers.provider.getBalance(mehWrapper.address)
    console.log("wrapper balance:", wrapperBalAfter - wrapperBalBefore)
    
  
    console.log("meh balance:", await getFormattedBalance(oldMeh.address))
    console.log("charity internal meh balance:", ethers.utils.formatEther((await oldMeh.getUserInfo(referrals[0].address)).balance))
    console.log("charity referral balance:", await getFormattedBalance(referrals[0].address))
    
    
    console.log("wrapper balance:", await getFormattedBalance(mehWrapper.address))
    

    
    console.log("wrapper:", mehWrapper.address)
    console.log("landlord:", (await oldMeh.getBlockInfo(83,83)).landlord)
    
    // wrapper balance is encreased
    // meh balance is the same
    // referrals balances are zero 
    // block is owned

    // referrals balances should be zero
    for (const referral of referrals) {
      console.log(
        "Referral: %s, meh-bal: %s, bal: %s", 
        referral.address, 
        ethers.utils.formatEther((await oldMeh.getUserInfo(referral.address)).balance),
        await getFormattedBalance(referral.address))
    }
  });
  
});
