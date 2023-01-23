const fs = require('fs')
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setupTestEnvironment } = require("../src/deployer.js")
const { rand1to100 } = require("../src/test-helpers.js")
const conf = require('../conf.js')

const BLOCKS_FROM_2018_PATH = conf.BLOCKS_FROM_2018_PATH
const IS_DEPLOYING_MOCKS = conf.IS_DEPLOYING_MOCKS
const FULL_TEST = conf.FULL_TEST
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

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

  it("pulls landlords from 2018 correctly", async function () {
    expect(await minter._landlordFrom2018Ext(52, 54)).to.equal("0x7911670881A81F8410d06053d7B3c237cE77b9B4")
    expect(await minter._landlordFrom2018Ext(100, 100)).to.equal("0x31483A93c879c9DCF85899f61b521E1e5b520b69")
    
    // if (FULL_TEST) {
    //   let blocks = JSON.parse(fs.readFileSync(BLOCKS_FROM_2018_PATH))
    //   for (let b of blocks) {
    //     expect(await minter._landlordFrom2018Ext(b.x, b.y)).to.equal(b.landlord)
    //   }
    // }

    expect(await minter._landlordFrom2018Ext(30, 71)).to.equal(ZERO_ADDRESS)
  })


  /// WARNING!!! ReservedFor function.  
  /// What if 2016 block was sold on 2018 contract

  it("Setup is correct", async function () {
    console.log("charityAddress:", await oldMeh.charityAddress())
  })

  it("Doesn't allow to mint reserved, already minted, etc...", async function () {
  })

  it("Check coords to tokenID conversion", async function () {
  })


})