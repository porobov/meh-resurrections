const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setupTestEnvironment } = require("../src/deployer.js")
const conf = require('../conf.js')

const IS_DEPLOYING_MOCKS = conf.IS_DEPLOYING_MOCKS

describe("Minter", function () {
  
    this.timeout(142000)
    before('setup', async () => {
      ;[ownerGlobal, buyer] = await ethers.getSigners()
      let env = await setupTestEnvironment({isDeployingMocks: IS_DEPLOYING_MOCKS, isDeployingMinterAdapter: true})
      owner = env.owner
      minter = env.mehWrapper
      referrals= env.referrals
      oldMeh = env.oldMeh
    })

  it("2018", async function () {
    expect(await minter._landlordFrom2018Ext(52, 54)).to.equal("0x7911670881A81F8410d06053d7B3c237cE77b9B4")
  })

  it("Setup is correct", async function () {
    console.log("charityAddress:", await oldMeh.charityAddress())
  })

  it("Doesn't allow to mint reserved, already minted, etc...", async function () {
  })

  it("Check coords to tokenID conversion", async function () {
  })


})