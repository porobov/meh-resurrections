const { expect } = require("chai");
const { ethers } = require("hardhat");
// const { BigNumber } = require("ethers")

// const conf = require('../conf.js')
// const IS_DEPLOYING_MOCKS = conf.IS_DEPLOYING_MOCKS
let usingToolsAdapter

describe("Minter", function () {
  
    this.timeout(142000)
    before('setup', async () => {
        const UsingToolsAdapter = await ethers.getContractFactory("UsingToolsAdapter");
        usingToolsAdapter = await UsingToolsAdapter.deploy();
        await usingToolsAdapter.deployed();
    })

// blockID
// blockXY
// blocksList
// countBlocks
it("Counting blocks correctly", async function () {
    expect(await usingToolsAdapter.countBlocksExt(1,1,1,1)).to.equal(1)
    expect(await usingToolsAdapter.countBlocksExt(1,1,2,2)).to.equal(4)
    expect(await usingToolsAdapter.countBlocksExt(1,1,100,100)).to.equal(10000)

})
// isLegalCoordinates

})