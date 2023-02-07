const { expect } = require("chai");
const fs = require('fs')
const { ethers } = require("hardhat");
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");
const { blockID, countBlocks } = require("../src/test-helpers.js")
const { setupTestEnvironment } = require("../src/deployer.js")
const conf = require('../conf.js')

const WRAPPER_BLOCK_PRICE = conf.WRAPPER_BLOCK_PRICE
const IS_DEPLOYING_MOCKS = conf.IS_DEPLOYING_MOCKS
const AVAILABLE_AREAS_PATH = conf.AVAILABLE_AREAS_PATH

let availableAreas = [
  {fx: 1, fy: 24, tx: 1, ty: 24}, // single
  {fx: 2, fy: 24, tx: 2, ty: 25}  // range
]

const av = JSON.parse(fs.readFileSync(AVAILABLE_AREAS_PATH))
let areaPrice = 0
describe("Allows to buy all", function () {
  
  this.timeout(142000)
  before('setup', async () => {
    ;[ownerGlobal, buyer] = await ethers.getSigners()
    let env = await setupTestEnvironment({isDeployingMocks: IS_DEPLOYING_MOCKS})
    owner = env.owner
    mehWrapper = env.mehWrapper
    referrals= env.referrals
    oldMeh = env.oldMeh
    let price = await mehWrapper.crowdsalePrice();
    await setBalance(buyer.address, price.mul(10000));
    areaPrice = price.mul(100)
  })

  for (let cc of av.slice(0,9)) {
    it(`Will mint blocks (${cc.fx}, ${cc.fy}, ${cc.tx}, ${cc.ty})`, async function () {
      await mehWrapper.connect(buyer).mint(cc.fx, cc.fy, cc.tx, cc.ty, { value: areaPrice })
    })
  }

  it("Allows to place ads", async function () {
  });

});
