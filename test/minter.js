const fs = require('fs')
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setupTestEnvironment } = require("../src/deployer.js")
const { rand1to100 } = require("../src/test-helpers.js")
const conf = require('../conf.js');
const { zeroPad } = require('ethers/lib/utils.js');

const BLOCKS_FROM_2018_PATH = conf.BLOCKS_FROM_2018_PATH
const BLOCKS_FROM_2016_PATH = conf.BLOCKS_FROM_2016_PATH
const IS_DEPLOYING_MOCKS = conf.IS_DEPLOYING_MOCKS
const RESERVED_FOR_FOUNDER = conf.RESERVED_FOR_FOUNDER
const FULL_TEST = conf.FULL_TEST
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const bb16 = JSON.parse(fs.readFileSync(BLOCKS_FROM_2016_PATH))
const bb18 = JSON.parse(fs.readFileSync(BLOCKS_FROM_2018_PATH))
  
let usingToolsAdapter
let founder_address

describe("Minter", function () {
  
    this.timeout(142000)
    before('setup', async () => {
      ;[ownerGlobal, buyer] = await ethers.getSigners()
      let env = await setupTestEnvironment({isDeployingMocks: IS_DEPLOYING_MOCKS, isDeployingMinterAdapter: true})
      owner = env.owner
      minter = env.mehWrapper
      referrals= env.referrals
      oldMeh = env.oldMeh

      const UsingToolsAdapter = await ethers.getContractFactory("UsingToolsAdapter");
      usingToolsAdapter = await UsingToolsAdapter.deploy();
      await usingToolsAdapter.deployed();

      founder_address = await minter.founder()
    })
  
  /// LANDLORDS

  /// WARNING!!! Block (100,100) data is outdated in BLOCKS_FROM_2018_PATH
  it("Pulls landlords from 2018 correctly", async function () {
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

  it("Pulls landlords from 2016 correctly", async function () {
    expect(await minter._landlordFrom2016Ext(19, 19)).to.equal("0xCA9f7D9aD4127e374cdaB4bd0a884790C1B03946")
    expect(await minter._landlordFrom2016Ext(100, 1)).to.equal("0xcd3abb51811DC119661FD502d1eC45fF33E2f7E3")
    
    // if (FULL_TEST) {
    //   let blocks = JSON.parse(fs.readFileSync(BLOCKS_FROM_2016_PATH))
    //   for (let b of blocks) {
    //     expect(await minter._landlordFrom2016Ext(b.x, b.y)).to.equal(b.landlord)
    //   }
    // }

    expect(await minter._landlordFrom2016Ext(30, 71)).to.equal(ZERO_ADDRESS)
  })

  /// WARNING!!!
  /// Two 2016 blocks were sold on 2018 contract
  /// see "if" statement below
  // it("Check that 2016 blocks are intact in 2018", async function () {
  //   if (FULL_TEST) {
  //     let blocks = JSON.parse(fs.readFileSync(BLOCKS_FROM_2016_PATH))
  //     for (let b of blocks) {
  //       if (
  //         (b.x == 51 && b.y == 35) || 
  //         (b.x == 50 && b.y == 34))
  //       {
  //       } else {
  //         expect(await minter._landlordFrom2018Ext(b.x, b.y)).to.equal(b.landlord)
  //       }
  //     }
  //   }
  // })


  it("Area for founders is defined correctly in confing", async function () {
    let cc = RESERVED_FOR_FOUNDER
    expect(founder_address).to.not.equal(ZERO_ADDRESS)
    expect(founder_address).to.equal(conf.FOUNDER_ADDRESS)
    expect(await usingToolsAdapter.countBlocksExt(cc.fx, cc.fy, cc.tx, cc.ty)).to.equal(1000)  // 10% - founder's share

    function isReserved(block) {
      for (let x = cc.fx; x <= cc.tx; x++) {
        for (let y = cc.fy; y <=cc.ty; y++) {
          if(x == block.x && y == block.y) {
            console.log("Intersection with founder (x,y):", x, y, block.landlord)
            return block.landlord
          }
        }
      }
      return 0
    }
    for (let block of bb16) {
      expect(isReserved(block)).to.equal(0)
    }
    for (let block of bb18) {
      expect(isReserved(block)).to.equal(0)
    }
  })

  it("Area for founders is defined correctly IN CONTRACT", async function () {
    let cc = RESERVED_FOR_FOUNDER
    expect(await minter._landlordFounderExt(cc.fx, cc.fy)).to.equal(founder_address)
    expect(await minter._landlordFounderExt(cc.fx + 2, cc.fy + 2)).to.equal(founder_address)
    expect(await minter._landlordFounderExt(cc.fx - 1, cc.fy)).to.equal(ZERO_ADDRESS)
    expect(await minter._landlordFounderExt(cc.tx, cc.ty)).to.equal(founder_address)
  })


  /// RESERVED FOR


  it("reservedFor. 2016 areas are reserved correctly", async function () {
    // 2016 // check single coordinate
    await expect(minter._reservedForExt(51, 35, 51, 35)).to.be.revertedWith("A block is already minted on 2016 contract");
    // 2016 // check range
    await expect(minter._reservedForExt(50, 34, 50, 35)).to.be.revertedWith("A block is already minted on 2016 contract");
  })

  it("reservedFor. 2018 areas are reserved correctly", async function () {
    // 2018 // check single coordinate
    expect(await minter._reservedForExt(51, 60, 51, 60)).to.equal("0xe81119bcf92Fa4E9234690Df8ad2F35896988A71")
    // check 2018 range
    expect(await minter._reservedForExt(48, 57, 52, 61)).to.equal("0xe81119bcf92Fa4E9234690Df8ad2F35896988A71")
  })

  it("reservedFor. Founders areas are reserved correctly", async function () {
    let cc = RESERVED_FOR_FOUNDER
    // founders starting and ending blocks 
    expect(await minter._reservedForExt(cc.fx, cc.fy, cc.fx, cc.fy)).to.equal(founder_address)
    expect(await minter._reservedForExt(cc.tx, cc.ty, cc.tx, cc.ty)).to.equal(founder_address)
    // check range
    expect(await minter._reservedForExt(cc.fx, cc.fy, cc.fx + 1, cc.fy + 1)).to.equal(founder_address)
  })

  it("reservedFor. Reverts with invalid range", async function () {
    // check invalid range 
    await expect(minter._reservedForExt(47, 57, 52, 61)).to.be.revertedWith("Multiple landlords within area");
    await expect(minter._reservedForExt(48, 57, 52, 62)).to.be.revertedWith("Multiple landlords within area");
  })

  it("reservedFor. Returns zero address for available areas", async function () {
    
    // check available area (single blocks and range)
    expect(await minter._reservedForExt(1, 24, 1, 24)).to.equal(ZERO_ADDRESS)
    expect(await minter._reservedForExt(1, 24, 2, 25)).to.equal(ZERO_ADDRESS)
  })

  // if (FULL_TEST) {
  //   it("reservedFor. ALL 2018 areas are reserved correctly", async function () {
  //     // checking all coordinates one by one 
      
  //       // 2018   
  //       for (let b of bb18) {
  //         expect(await minter._reservedForExt(b.x, b.y, b.x, b.y)).to.equal(b.landlord)
  //       }

  //       // all 2016 blocks should revert
  //       for (let b of bb16) {
  //         await expect(minter._reservedForExt(b.x, b.y, b.x, b.y)).to.be.revertedWith("A block is already minted on 2016 contract");
  //       }
  //   })
  // }

  //// WARNING!!! This test exceeds Alchemy request rate limits!
  //// When calling big range through _reservedForExt(x, y, x, y) every block will 
  //// be requested from alchemy. Test time limit will be met
  //// testing coordinates one by one because of this
  // if (FULL_TEST) {
  //   let cc = RESERVED_FOR_FOUNDER
  //   for (let x = cc.fx; x <= cc.tx; x++) {
  //     for (let y = cc.fy; y <=cc.ty; y++) {
  //       it(`Area for founders is reserved correctly (${x}, ${y})`, async function () {
  //         expect(await minter._reservedForExt(x, y, x, y)).to.equal(founder_address)
  //       })
  //     }
  //   }
  // }


  it("Setup is correct", async function () {
    console.log("charityAddress:", await oldMeh.charityAddress())
  })


  it("Doesn't allow to mint reserved, already minted, etc...", async function () {
  })

  it("Check coords to tokenID conversion", async function () {
  })

  // try meh2018.ownerOf(i)

})