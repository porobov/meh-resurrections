const fs = require('fs')
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");
const { setupTestEnvironment } = require("../src/deployer.js")
const { rand1to100, blockID, countBlocks, balancesSnapshot, getTotalGas } = require("../src/test-helpers.js")
const { getImpersonatedSigner } = require("../src/tools.js")
const conf = require('../conf.js');
const exp = require('constants');

let usingToolsAdapter
let founderAddress
let partnerAddress
let mintingPrice = ethers.utils.parseEther("1")
let gasCalculationAccuracy = 300

// function to share deployment sequence between blocks of tests
// Solution from here https://stackoverflow.com/a/26111323
function makeSuite(name, tests) {
  describe(name, function () {
    before('setup', async () => {
      ;[ownerGlobal, buyer, friend] = await ethers.getSigners()
      let env = await setupTestEnvironment({
        isDeployingMocks: conf.IS_DEPLOYING_MOCKS, 
        isDeployingMinterAdapter: true
      })
      owner = env.owner
      wrapper = env.mehWrapper
      referrals= env.referrals
      oldMeh = env.oldMeh
      founderAddress = await wrapper.founder()
      partnerAddress = await wrapper.partners()
    })
      this.timeout(142000)
      tests();
  });
}

makeSuite("Basic", function () {

  it("Is splitting income correctly", async function () {
    // send funds to wrapper and set royalties through test-adapter
    let value = ethers.utils.parseEther("1.0")
    await wrapper.setRoyalties(value)
    await friend.sendTransaction({
      to: wrapper.address,
      value: value,
    })
    // split income through test-adapter
    await wrapper._splitIncomeExt()
    // check
    let foundersShare = value.mul(conf.FOUNDER_SHARE_PERCENT).div(100)
    let partnersShare = value.sub(foundersShare)
    expect(await wrapper.internalBalOf(founderAddress)).to.be.equal(foundersShare)
    expect(await wrapper.internalBalOf(partnerAddress)).to.be.equal(partnersShare)
  })
})