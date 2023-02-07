// this script will scrap all available areas and create list of blocks to buy 

const fs = require('fs')
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setupTestEnvironment } = require("../src/deployer.js")
const { rand1to100, blockID, balancesSnapshot } = require("../src/test-helpers.js")
const conf = require('../conf.js');
const chalk = require('chalk');
const { check } = require('prettier');
const BLOCKS_FROM_2018_PATH = conf.BLOCKS_FROM_2018_PATH
const BLOCKS_FROM_2016_PATH = conf.BLOCKS_FROM_2016_PATH

// areas used in all other tests

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
let maxBlocksFounder = 228 // see below how it was found
const vacantAreasPath = 'old_MEH_blocks/vacant_areas.json'

let intersection = 
  [
    {
      "x": 51,
      "y": 35,
      "landlord": "does not matter"
    },
    {
      "x": 51,
      "y": 35,
      "landlord": "does not matter"
    },
  ]

const cc = [conf.RESERVED_FOR_FOUNDER]
const bb16 = JSON.parse(fs.readFileSync(BLOCKS_FROM_2016_PATH))
const bb18 = JSON.parse(fs.readFileSync(BLOCKS_FROM_2018_PATH))

let availableAreas = []

// too slow (some hardhat bug probably or alchemy limit)
async function readFromChain() {
  try {
    // founder area is 1000 blocks
    // It requires more gas than the Ethereum block gas limit
    // 20x20 is already too much 
    // 15x15, 19x12 is ok ()
    // let divideBy = 2 
    // let newLenX = Math.floor((cc.tx - cc.fx)/divideBy)
    // let newLenY = Math.floor((cc.ty - cc.fy)/divideBy)
    // console.log(newLenX, newLenY)
    // await wrapper.mintReserved(cc.fx, cc.fy, cc.fx + newLenX - 4, cc.fy + newLenY + 3)
    let reservedFor = await wrapper._reservedForExt(cm.fx, cm.fy, cm.tx, cm.ty)
    if (reservedFor == ZERO_ADDRESS) {
        availableAreas.push(cm)
    }
    console.log(chalk.green(cm.fx, cm.fy, cm.tx, cm.ty, "- vacant"))
  } catch (e) {
      if("code" in e && e.code == "CALL_EXCEPTION") {
          console.log(cm, e.reason)
      } else {
          throw e
      }
  }
}

function isVacant(check, reserved) {
  for (rsrvd of reserved) {
    if (rsrvd.x >= check.fx && rsrvd.x <= check.tx && rsrvd.y >= check.fy && rsrvd.y <= check.ty) {
      return false
    }
  }
  return true
}
async function main() { 
    ;[ownerGlobal, buyer] = await ethers.getSigners()

    // let env = await setupTestEnvironment({isDeployingMocks: false, isDeployingMinterAdapter: true})
    // wrapper = env.mehWrapper
    // oldMeh = env.oldMeh
    // await oldMeh.getBlockInfo(1, 1)  // ping oldMeh to make hardhat notice it 🤷
    let lenX = 9
    let lenY = 9
    let total = 0
    for (let fromX = 1; fromX <= 100 - lenX; fromX += lenX + 1) {
        for (let fromY = 1; fromY <= 100 - lenY; fromY += lenY + 1) {
            let cm = {fx: fromX, fy: fromY, tx: fromX + lenX, ty: fromY + lenY}
            if (
              isVacant(cm, cc) &&
              isVacant(cm, bb16) &&
              isVacant(cm, bb18))
            {
              availableAreas.push(cm)
              console.log(chalk.green(cm.fx, cm.fy, cm.tx, cm.ty, "- vacant"))
              total += 100
            }
        }
    }
    console.log("total:", total)
    fs.writeFileSync(vacantAreasPath, JSON.stringify(availableAreas, null, 2))

}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
  });