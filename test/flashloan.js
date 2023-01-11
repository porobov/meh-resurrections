const { expect } = require("chai");
const { ethers } = require("hardhat");
const { getFormattedBalance } = require("../src/tools.js")
const { setupTestEnvironment } = require("../src/deployer.js")

describe("Flashloan", function () {
  this.timeout(142000)
  before('setup', async () => {
    let env = await setupTestEnvironment(true)
    owner = env.owner
    mehWrapper = env.mehWrapper
    referrals= env.referrals
    oldMeh = env.oldMeh
  })

  it("Should should return block info", async function () {
    
    console.log("owner balance:", await getFormattedBalance(owner.address))
    console.log("meh balance:", await getFormattedBalance(oldMeh.address))
    console.log("charity internal meh balance:", ethers.utils.formatEther((await oldMeh.getUserInfo(referrals[0].address)).balance))
    console.log("charity referral balance:", await getFormattedBalance(referrals[0].address))
    console.log("wrapper balance:", await getFormattedBalance(mehWrapper.address))
    
    // temp. sending eth to the contract
    // await mehWrapper.connect(owner).referralPayback({value: ethers.utils.parseEther("1")});
    // await owner.sendTransaction({
    //   to: mehWrapper.address,
    //   value: ethers.utils.parseEther("1")
    // })

    // buy blocks
    // now wrapper can buy blocks for free 
    // as it collects all the revenue from referrals and charity
    const tx = await mehWrapper.connect(owner).mint(83,83,83,83,{value: ethers.utils.parseEther("0.25")});
    const receipt = await tx.wait(1)  // TODO look for these wait() expressions
    // gas
    const gasCosts = receipt.cumulativeGasUsed.mul(ethers.utils.parseUnits ("30", "gwei"))
    console.log("gas:", receipt.cumulativeGasUsed.toNumber())
    console.log("gas:", ethers.utils.formatEther(gasCosts))
    console.log("usd:", ethers.utils.formatEther(gasCosts)*1200)
    

    console.log("owner balance:", await getFormattedBalance(owner.address))
    console.log("meh balance:", await getFormattedBalance(oldMeh.address))
    console.log("charity internal meh balance:", ethers.utils.formatEther((await oldMeh.getUserInfo(referrals[0].address)).balance))
    console.log("charity referral balance:", await getFormattedBalance(referrals[0].address))
    console.log("wrapper balance:", await getFormattedBalance(mehWrapper.address))
    
    console.log("referrals[0].address", referrals[0].address)
    console.log("charityAddress:", await oldMeh.charityAddress())
    console.log("wrapper:", mehWrapper.address)
    console.log("landlord:", (await oldMeh.getBlockInfo(83,83)).landlord)
    
    for (const referral of referrals) {
      console.log(
        "Referral: %s, meh-bal: %s, bal: %s", 
        referral.address, 
        ethers.utils.formatEther((await oldMeh.getUserInfo(referral.address)).balance),
        await getFormattedBalance(referral.address))
    }
  });
  
});
