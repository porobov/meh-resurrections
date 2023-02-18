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
let beneficiaries
let gasCalculationAccuracy = 300

// function to share deployment sequence between blocks of tests
// Solution from here https://stackoverflow.com/a/26111323
function makeSuite(name, tests) {
  describe(name, function () {
    before('setup', async () => {
      ;[ownerGlobal, stranger, friend] = await ethers.getSigners()
      let env = await setupTestEnvironment({
        isDeployingMocks: conf.IS_DEPLOYING_MOCKS, 
        isDeployingMinterAdapter: true
      })
      owner = env.owner
      wrapper = env.mehWrapper
      referrals= env.referrals
      oldMeh = env.oldMeh
      beneficiaries = 
          {
            "founder": await wrapper.founder(),
            "partner": await wrapper.partners()
          }
    })
      this.timeout(142000)
      tests();
  });
}

makeSuite("Basic", function () {

  it("Founder and partner are set up correctly", async function () {
    expect(42).to.be.equal(2)
  })

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
    expect(await wrapper.internalBalOf(beneficiaries.founder)).to.be.equal(foundersShare)
    expect(await wrapper.internalBalOf(beneficiaries.partner)).to.be.equal(partnersShare)
    expect(await wrapper.royalties()).to.be.equal(0)
  })

  it("Stranger cannot withdraw income", async function () {
    await expect(wrapper.connect(stranger).withdrawShare()).to.be.revertedWith(
      "Admin: Not an authorized beneficiary"
    )
  })
  
  it("work harder", async function () {
    for (const [name, addrs] of Object.entries(beneficiaries)) {
      let beneficiary = await getImpersonatedSigner(addrs)
      await expect(wrapper.connect(beneficiary).withdrawShare()).to.be.revertedWith(
        "Admin: No royalties yet, work harder!"
      )
    }
  })
})