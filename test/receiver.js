const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setupTestEnvironment } = require("../src/deployer.js")
const conf = require('../conf.js');

// function to share deployment sequence between blocks of tests 
// Solution from here https://stackoverflow.com/a/26111323 
function makeSuite(name, tests) {
  describe(name, function () {
    before('setup', async () => {
      ;[ownerGlobal, stranger] = await ethers.getSigners()
      let env = await setupTestEnvironment({isDeployingMocksForTets: conf.IS_DEPLOYING_MOCKS_FOR_TESTS, isDeployingMinterAdapter: true})
      wrapper = env.mehWrapper
    })
      this.timeout(142000)
      tests();
  });
}

makeSuite("Receiving", function () {

  // Other tests make sure that wrapper does receive funds from WETH and OldMeh
  it("Cannot receive funds from strangers", async function () {
    let value = ethers.parseEther("1.0")
    await expect(stranger.sendTransaction({
      to: wrapper.address,
      value: value,
    })).to.be.revertedWith(
      "Receiver: Only receives from oldMEH or WETH")
  })
})