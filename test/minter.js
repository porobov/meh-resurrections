const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setupTestEnvironment } = require("../src/deployer.js")
const conf = require('../conf.js')

const IS_DEPLOYING_MOCKS = conf.IS_DEPLOYING_MOCKS

describe("Minter", function () {
  
    this.timeout(142000)
    before('setup', async () => {
      ;[ownerGlobal, buyer] = await ethers.getSigners()
      let env = await setupTestEnvironment(IS_DEPLOYING_MOCKS)
      owner = env.owner
      mehWrapper = env.mehWrapper
      referrals= env.referrals
      oldMeh = env.oldMeh
    })

    // testing contracts 
    // need a mock? 
    // Admin - no
    // Collector - no
    // Flashloaner - no 
    // MehERC721 - no 
    // minter - yes
    // receiver - no 
    // referral - no 
    // usingGlobals - no 
    // usingTools - yes

  it("Setup is correct", async function () {
    console.log("charityAddress:", await oldMeh.charityAddress())
  })

  it("Doesn't allow to mint reserved, already minted, etc...", async function () {
  })

  it("Check coords to tokenID conversion", async function () {
  })


})