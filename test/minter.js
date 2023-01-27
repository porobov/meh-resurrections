const fs = require('fs')
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setupTestEnvironment } = require("../src/deployer.js")
const { rand1to100, blockID, balancesSnapshot } = require("../src/test-helpers.js")
const conf = require('../conf.js');
const { zeroPad } = require('ethers/lib/utils.js');
const exp = require('constants');

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

let availableAreas = [
  {fx: 1, fy: 24, tx: 1, ty: 24}, // single
  {fx: 2, fy: 24, tx: 2, ty: 25}  // range
]
let a = RESERVED_FOR_FOUNDER
let founderAreas = [
  {fx: a.fx, fy: a.fy, tx: a.fx, ty: a.fy}, // single
  {fx: a.fx + 1, fy: a.fy, tx: a.fx + 1, ty: a.fy + 1}  // range (2 blocks)
]

let areas2018 = [
  {fx: 51, fy: 60, tx: 51, ty: 60, landlord: "0xe81119bcf92Fa4E9234690Df8ad2F35896988A71"}, // single
  {fx: 48, fy: 57, tx: 52, ty: 59, landlord: "0xe81119bcf92Fa4E9234690Df8ad2F35896988A71"}  // range
]

let occupiedAreas = [
  {fx: 1, fy: 1, tx: 1, ty: 1}, // single
]


// function to share deployment sequence between blocks of tests 
// Solution from here https://stackoverflow.com/a/26111323 
function makeSuite(name, tests) {
  describe(name, function () {
    before('setup', async () => {
      ;[ownerGlobal, buyer] = await ethers.getSigners()
      let env = await setupTestEnvironment({isDeployingMocks: IS_DEPLOYING_MOCKS, isDeployingMinterAdapter: true})
      owner = env.owner
      minter = env.mehWrapper
      referrals= env.referrals
      oldMeh = env.oldMeh
      // newMeh = env.newMeh

      const UsingToolsAdapter = await ethers.getContractFactory("UsingToolsAdapter");
      usingToolsAdapter = await UsingToolsAdapter.deploy();
      await usingToolsAdapter.deployed();

      founder_address = await minter.founder()
      buyer = owner 
    })
      this.timeout(142000)
      tests();
  });
}








makeSuite("Reading contract", function () {

  /// LANDLORDS

  // /// WARNING!!! Block (100,100) data is outdated in BLOCKS_FROM_2018_PATH
  // it("Pulls landlords from 2018 correctly", async function () {
  //   expect(await minter._landlordFrom2018Ext(52, 54)).to.equal("0x7911670881A81F8410d06053d7B3c237cE77b9B4")
  //   expect(await minter._landlordFrom2018Ext(100, 100)).to.equal("0x31483A93c879c9DCF85899f61b521E1e5b520b69")
    
  //   // if (FULL_TEST) {
  //   //   let blocks = JSON.parse(fs.readFileSync(BLOCKS_FROM_2018_PATH))
  //   //   for (let b of blocks) {
  //   //     expect(await minter._landlordFrom2018Ext(b.x, b.y)).to.equal(b.landlord)
  //   //   }
  //   // }

  //   expect(await minter._landlordFrom2018Ext(30, 71)).to.equal(ZERO_ADDRESS)
  //   expect(await minter._landlordFrom2018ByIndexExt(blockID(100, 100))).to.equal("0x31483A93c879c9DCF85899f61b521E1e5b520b69")
  // })

  it("Pulls landlords by index from 2018 correctly", async function () {
    // this block is present in both 2016 and 2018
    expect(await minter._landlordFrom2018ByIndexExt(blockID(1, 1))).to.equal("0x95fdB8BB2167d7DA27965952CD4c15dA6Ac46d60")

    expect(await minter._landlordFrom2018ByIndexExt(blockID(54, 54))).to.equal("0x7911670881A81F8410d06053d7B3c237cE77b9B4")
    expect(await minter._landlordFrom2018ByIndexExt(blockID(52, 54))).to.equal("0x7911670881A81F8410d06053d7B3c237cE77b9B4")
    expect(await minter._landlordFrom2018ByIndexExt(blockID(100, 100))).to.equal("0x31483A93c879c9DCF85899f61b521E1e5b520b69")
    
    // if (FULL_TEST) {
    //   let blocks = JSON.parse(fs.readFileSync(BLOCKS_FROM_2018_PATH))
    //   for (let b of blocks) {
    //     expect(await minter._landlordFrom2018ByIndexExt(blockID(b.x, b.y))).to.equal(b.landlord)
    //   }
    // }
    // console.log(await newMeh.blockID(30, 71)) 

    expect(await minter._landlordFrom2018ByIndexExt(blockID(30, 71))).to.equal(ZERO_ADDRESS)
    expect(await minter._landlordFrom2018ByIndexExt(blockID(100, 100))).to.equal("0x31483A93c879c9DCF85899f61b521E1e5b520b69")

    let s = areas2018[0]
    expect(await minter._landlordFrom2018ByIndexExt(blockID(s.fx, s.fy))).to.equal("0xe81119bcf92Fa4E9234690Df8ad2F35896988A71")
    expect(await minter._reservedForExt(s.fx, s.fy, s.tx, s.ty))
      .to.equal("0xe81119bcf92Fa4E9234690Df8ad2F35896988A71")
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
    let s = areas2018[0]
    expect(await minter._reservedForExt(s.fx, s.fy, s.tx, s.ty))
      .to.equal("0xe81119bcf92Fa4E9234690Df8ad2F35896988A71")
    // check 2018 range
    let r = areas2018[1]
    expect(await minter._reservedForExt(r.fx, r.fy, r.tx, r.ty))
      .to.equal("0xe81119bcf92Fa4E9234690Df8ad2F35896988A71")
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

  it("Area crowdsale price is defined correctly", async function () {
    let price = await minter.crowdsalePrice();
    // multiple blocks
    let cc = {fx: 61, fy: 44, tx: 100, ty: 68}
    let count = await usingToolsAdapter.countBlocksExt(cc.fx, cc.fy, cc.tx, cc.ty)
    let total = price.mul(count)
    expect(await minter._areaCrowdsalePriceExt(cc.fx, cc.fy, cc.tx, cc.ty)).to.equal(total)
    // single block and two blocks
    expect(await minter._areaCrowdsalePriceExt(1,1,1,1)).to.equal(price)
    expect(await minter._areaCrowdsalePriceExt(1,1,2,1)).to.equal(price.mul(2))
  })
})






makeSuite("buyFromMEH", function () {

  for (let cc of availableAreas) {
    it(`_buyFromMEH works: (${cc.fx}, ${cc.fy}, ${cc.tx}, ${cc.ty})`, async function () {
      let count = await usingToolsAdapter.countBlocksExt(cc.fx, cc.fy, cc.tx, cc.ty)
      let oldMehPrice = ethers.utils.parseEther("1")
      let total = oldMehPrice.mul(count)
      let sb = await balancesSnapshot(oldMeh, minter, referrals)
      await minter._buyFromMEHExt(
        total, buyer.address, cc.fx, cc.fy, cc.tx, cc.ty, { value: total })
      let sa = await balancesSnapshot(oldMeh, minter, referrals)

      expect(sa.wrapper.sub(sb.wrapper)).to.equal(total)  // all money is returned
      expect(sa.meh.sub(sb.meh)).to.equal(0)
      expect(sa.royalties.sub(sb.royalties)).to.equal(0)
      expect((await oldMeh.getBlockInfo(cc.fx, cc.fy)).landlord).to.equal(minter.address)
      expect(await minter.ownerOf(blockID(cc.fx, cc.fy))).to.equal(buyer.address)
    })
  }

  it("_buyFromMEH throws on occupied areas", async function () {
    let cc = occupiedAreas[0]
    let oldMehPrice = ethers.utils.parseEther("1")
    await expect(minter._buyFromMEHExt(
      oldMehPrice, buyer.address, cc.fx, cc.fy, cc.tx, cc.ty, { value: oldMehPrice })
        ).to.be.reverted 
  })
})

// same tests as for buyFromMEH, but with flashloan
makeSuite("_borrowAndBuyFromMEH", function () {
  for (let cc of availableAreas) {
    it(`_borrowAndBuyFromMEH works: (${cc.fx}, ${cc.fy}, ${cc.tx}, ${cc.ty})`, async function () {
      let sb = await balancesSnapshot(oldMeh, minter, referrals)
      await minter._borrowAndBuyFromMEHExt(buyer.address, cc.fx, cc.fy, cc.tx, cc.ty)
      let sa = await balancesSnapshot(oldMeh, minter, referrals)

      expect(sa.wrapper.sub(sb.wrapper)).to.equal(0)  // all money is returned
      expect(sa.meh.sub(sb.meh)).to.equal(0)
      expect(sa.royalties.sub(sb.royalties)).to.equal(0)
      expect((await oldMeh.getBlockInfo(cc.fx, cc.fy)).landlord).to.equal(minter.address)
      expect(await minter.ownerOf(blockID(cc.fx, cc.fy))).to.equal(buyer.address)
    })
  }

  it("_borrowAndBuyFromMEH throws on occupied areas", async function () {
    let cc = occupiedAreas[0]
    await expect(minter._borrowAndBuyFromMEHExt(buyer.address, cc.fx, cc.fy, cc.tx, cc.ty))
      .to.be.revertedWith("Area price is 0")
  })
})






makeSuite("mint", function () {

  it("Will throw with wrong input", async function () {
    let c18 = bb18[0]
    let cc = availableAreas[0]
    await expect(minter.connect(buyer).mint(c18.x, c18.y, c18.x - 1, c18.y))
      .to.be.revertedWith("Wrong coordinates")
    await expect(minter.connect(buyer).mint(c18.x, c18.y, c18.x, c18.y))
      .to.be.revertedWith("A block is reserved for 2018 landlords or founders")
    await expect(minter.connect(buyer).mint(cc.fx, cc.fy, cc.fx, cc.fy))
      .to.be.revertedWith("Not enough eth to mint")
  })
  
  for (let cc of availableAreas) {
    it(`Will mint blocks, royalties are payed (${cc.fx}, ${cc.fy}, ${cc.tx}, ${cc.ty})`, async function () {
      let price = await minter.crowdsalePrice();
      let count = await usingToolsAdapter.countBlocksExt(cc.fx, cc.fy, cc.tx, cc.ty)
      let total = price.mul(count)
      let sb = await balancesSnapshot(oldMeh, minter, referrals)
      await minter.connect(buyer)
        .mint(cc.fx, cc.fy, cc.tx, cc.ty, { value: total })
      let sa = await balancesSnapshot(oldMeh, minter, referrals)

      expect(sa.wrapper.sub(sb.wrapper)).to.equal(total)
      expect(sa.meh.sub(sb.meh)).to.equal(0)
      expect(sa.royalties.sub(sb.royalties)).to.equal(total)
      expect((await oldMeh.getBlockInfo(cc.fx, cc.fy)).landlord).to.equal(minter.address)
      expect(await minter.ownerOf(blockID(cc.fx, cc.fy))).to.equal(buyer.address)
    })
  }
})





makeSuite("mintReserved ", function () {

  it("Will throw with wrong input", async function () {
    let cf = RESERVED_FOR_FOUNDER
    await expect(minter.connect(buyer).mint(cf.fx, cf.fy, cf.fx - 1, cf.fy))
      .to.be.revertedWith("Wrong coordinates")
  })

  for (let cc of founderAreas) {
    it(`Will mint blocks reserved for founder to founder (${cc.fx}, ${cc.fy}, ${cc.tx}, ${cc.ty})`, async function () {
      let sb = await balancesSnapshot(oldMeh, minter, referrals)
      await minter.connect(buyer)
        .mintReserved(cc.fx, cc.fy, cc.tx, cc.ty)
      let sa = await balancesSnapshot(oldMeh, minter, referrals)

      expect(sa.wrapper.sub(sb.wrapper)).to.equal(0)
      expect(sa.meh.sub(sb.meh)).to.equal(0)
      expect(sa.royalties.sub(sb.royalties)).to.equal(0)
      expect((await oldMeh.getBlockInfo(cc.fx, cc.fy)).landlord).to.equal(minter.address)
      expect(await minter.ownerOf(blockID(cc.fx, cc.fy))).to.equal(founder_address)
    })
  }

  for (let cc of areas2018) {
    it(`Will mint blocks reserved 2018 to 2018 landlord (${cc.fx}, ${cc.fy}, ${cc.tx}, ${cc.ty})`, async function () {
      let sb = await balancesSnapshot(oldMeh, minter, referrals)
      await minter.connect(buyer)
        .mintReserved(cc.fx, cc.fy, cc.tx, cc.ty)
      let sa = await balancesSnapshot(oldMeh, minter, referrals)

      expect(sa.wrapper.sub(sb.wrapper)).to.equal(0)
      expect(sa.meh.sub(sb.meh)).to.equal(0)
      expect(sa.royalties.sub(sb.royalties)).to.equal(0)
      expect((await oldMeh.getBlockInfo(cc.fx, cc.fy)).landlord).to.equal(minter.address)
      expect(await minter.ownerOf(blockID(cc.fx, cc.fy))).to.equal(cc.landlord)
    })
  }
})
