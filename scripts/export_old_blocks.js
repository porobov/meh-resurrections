// this script is needed to export old MEH blocks

// const hre = require("hardhat");
// const { ethers, network } = require("hardhat");

const fs = require('fs')
const BigNumber = require ("ethers")
const conf = require('../conf.js')


// let oldMeh
// let newMeh

/// READING EVENTS

// read old MEH events
// event NewAreaStatus (uint ID, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY, uint price);
// The event shows both sales and buys. Filtering buys further. 
// Owner is no specified here. Fetching owner further.
async function readOldMehEvents(oldMeh) {
  const eventFilter = oldMeh.filters.NewAreaStatus()
  const newAreaStatusEvents = await oldMeh.queryFilter(eventFilter)
  const data = []
  for (const event of newAreaStatusEvents) { // You can use `let` instead of `const` if you like
    data.push({
      blockNumber: event.blockNumber,
      ID: event.args.ID.toString(),
      fromX: event.args.fromX,
      fromY: event.args.fromY,
      toX: event.args.toX,
      toY: event.args.toY,
      price: event.args.price.toString()
    })
  }
  return data
}

// read 2018 MEH events
// emit LogBuys(id, fromX, fromY, toX, toY, msg.sender);
async function readNewMehEvents(newMeh) {
  const eventFilter = newMeh.filters.LogBuys()
  const newAreaStatusEvents = await newMeh.queryFilter(eventFilter)
  const data = []
  for (const event of newAreaStatusEvents) { // You can use `let` instead of `const` if you like
    data.push({
      blockNumber: event.blockNumber,
      ID: event.args.ID.toString(),
      fromX: event.args.fromX,
      fromY: event.args.fromY,
      toX: event.args.toX,
      toY: event.args.toY,
      landlord: event.args.newLandlord
    })
  }
  return data
}

/// EXTRACTING BLOCKS
// Events show areas (fromX, fromY, toX, toY). 
// But we need block-by-block info (X, Y, owner). Calculating blocks here. 

// Filtering buy-events. These events have price set to 0.
// TODO Consider! Owner may have set a sale price and then decide to not sell 
// by setting the price back to 0. This will create duplicate record for the owner.
// Checking duplicates further
function extractOldBlocks(events) {
  // the following line doesn't matter much actually. Just some minor optimization.
  // we just need events with any status change
  const buyEvents = events.filter(event => { return event.price == '0' });
  const blocks = []
  for (const buyEvent of buyEvents) {
    for (let x = buyEvent.fromX; x <= buyEvent.toX; x++) {
      for (let y = buyEvent.fromY; y <= buyEvent.toY; y++) {
        blocks.push({x: x, y: y})
      }
    }
  }
  return blocks
}

// Old MEH does not include new owner in the event.
// We need to querry current owner for each block throuhg contract calls.
async function querryOldLandlords(oldMeh, oldBlocks) {
  const blocks = []
  for (const oldBlock in oldBlocks) {
    const x = oldBlocks[oldBlock].x
    const y = oldBlocks[oldBlock].y
    const info = await oldMeh.getBlockInfo(x,y)
    blocks.push({x: x, y: y, landlord: info.landlord})
    console.log(info.sellPrice.toString())
  }
  return blocks
}

// Find duplicates in old blocks
function removeDuplicates(oldBlocks) {
  const lib = []
  const blocks = []
  for (const block of oldBlocks) {
    const record = block.x + " " + block.y + " " + block.landlord
    const found = lib.find(element => element == record);
    if (found) {
      console.log(record, "=>", block.x, block.y, block.landlord)
      // console.log produces a single line:
      // 51 42 0x9AF5Ba5a5566bA95AFC13E790d80440f407aa1a8 => 51 42 0x9AF5Ba5a5566bA95AFC13E790d80440f407aa1a8
      // meaning that this owner tried to sell the block and then changed their mind and set price to 0
    } else {
      lib.push(record)
      blocks.push(block)
    }
  }
  return blocks

  // const events = JSON.parse(fs.readFileSync('data/NewAreaStatus.js'))
  // for (const buyEvent of events) {
  //   for (let x = buyEvent.fromX; x <= buyEvent.toX; x++) {
  //     for (let y = buyEvent.fromY; y <= buyEvent.toY; y++) {
  //       if (x == 51 && y == 42) {
  //         console.log(buyEvent)
  //       }
  //     }
  //   }
  // }
  // block numbers 
  // buy at 3268010, sell at 3271089, 3990008, 4315564, buy at 4315567
}

// Extracting blocks from 2018 MEH events
function extractNewBlocks(events) {
  const blocks = []
  for (const buyEvent of events) {
    for (let x = buyEvent.fromX; x <= buyEvent.toX; x++) {
      for (let y = buyEvent.fromY; y <= buyEvent.toY; y++) {
        blocks.push({x: x, y: y, landlord: buyEvent.landlord})
      }
    }
  }
  return blocks
}

// Compare old and 2018 blocks 
// We need to see new buys at 2018 contract and are there any intersections between
// old and 2018 contracts (same block may have different owners).
// For each 2018 block we check if the same exists in the old version.
// If it does we do noting.
// If it doesn't we need to mint it on the old contract.
// And all blocks (both old and 2018) must be minted on the wrapper.

function compareBlocks(oldBlocks, newBlocks) {
  let countSame = 0
  const importBack = []
  for (const newBlock of newBlocks) {
    let foundSame = false
    for (const oldBlock of oldBlocks) {
      if (oldBlock.x == newBlock.x && oldBlock.y == newBlock.y && oldBlock.landlord == newBlock.landlord) {
        countSame++
        foundSame = true
        break
      }
    }
    if (!foundSame) {
      foundSame = false
      importBack.push(newBlock)
    }
  }
  
  console.log(
  "Old Contract got %s blocks, which also exist in the 2018 contract (imported at launch)\n\
2018 Contract got total of %s blocks", countSame, newBlocks.length)
  if (countSame == oldBlocks.length) {
    console.log("No overlaps occured. Old blocks didn't change in 2018 contract.")
  }
  return importBack
}

// Sanity check
// If there are any owners of the to-be-imported blocks in the old contract,
// it means we have intersection.
async function checkLandlords(blocksForImport, oldMeh) {
  const blocks = []
  for (const block of blocksForImport) {
    const x = block.x
    const y = block.y
    const info = await oldMeh.getBlockInfo(x,y)
    if (info.landlord !== "0x0000000000000000000000000000000000000000") {
      console.log("Got overlap %s", info.landlord)
      blocks.push({x: x, y: y, landlord: info.landlord})
    }
  }
  return blocks
}

async function main() {
  const oldMehAbi = conf.oldMehAbi
  const newMehAbi = conf.newMehAbi
  const oldMehAddress = conf.oldMehAddress
  const newMehAddress = conf.newMehAddress

  signer = (await ethers.getSigners())[0]
  console.log("Starting with singer address", signer.address)

  const oldMehContract = new ethers.Contract(oldMehAddress, oldMehAbi, signer)

  const oldMehEvents = await readOldMehEvents(oldMehContract)
  fs.writeFileSync('old_MEH_blocks/data/Old_NewAreaStatus_Events.json', JSON.stringify(oldMehEvents, null, 2))
  console.log("Loaded %s NewAreaStatus events from Old MEH contract", oldMehEvents.length)

  // const oldMehEvents = JSON.parse(fs.readFileSync('old_MEH_blocks/data/Old_NewAreaStatus_Events.json'))
  const oldBlocksNoLandlordsDuplicates = extractOldBlocks(oldMehEvents)
  console.log("Extracted %s blocks info from old meh events (no landlords, probably got duplicates) ", oldBlocksNoLandlordsDuplicates.length)
  fs.writeFileSync('old_MEH_blocks/data/Old_Blocks_No_Landlords_Duplicates.json', JSON.stringify(oldBlocksNoLandlordsDuplicates, null, 2))
  
  // const oldBlocksNoLandlords = JSON.parse(fs.readFileSync('data/oldBlocks.json'))
  const oldBlocksDuplicates = await querryOldLandlords(oldMehContract, oldBlocksNoLandlordsDuplicates)
  console.log("Appended landlords info to %s of old blocks", oldBlocksDuplicates.length)
  fs.writeFileSync('old_MEH_blocks/data/Old_Blocks_Duplicates.json', JSON.stringify(oldBlocksDuplicates, null, 2))
  
  // const oldBlocksDuplicates = JSON.parse(fs.readFileSync('old_MEH_blocks/data/Old_Blocks_Duplicates.json'))
  const oldBlocks = removeDuplicates(oldBlocksDuplicates)
  console.log("Removed duplicates from old blocks. Now there are %s of old blocks", oldBlocks.length)
  fs.writeFileSync('old_MEH_blocks/Old_Blocks.json', JSON.stringify(oldBlocks, null, 2))

  const newMehContract = new ethers.Contract(newMehAddress, newMehAbi, signer)

  const newMehEvents = await readNewMehEvents(newMehContract)
  console.log("Loaded %s LogBuys events from 2018 MEH contract", newMehEvents.length)
  fs.writeFileSync('old_MEH_blocks/data/2018_LogBuys_Events.json', JSON.stringify(newMehEvents, null, 2))

  // const newMehEvents = JSON.parse(fs.readFileSync('data/2018_LogBuys.json'))
  const newBlocks = extractNewBlocks(newMehEvents)
  console.log("Extracted %s blocks info from 2018 meh events", newBlocks.length)
  fs.writeFileSync('old_MEH_blocks/data/2018_Blocks.json', JSON.stringify(newBlocks, null, 2))

  // const oldBlocks = JSON.parse(fs.readFileSync('old_MEH_blocks/Old_Blocks.json'))
  // const newBlocks = JSON.parse(fs.readFileSync('old_MEH_blocks/data/2018_Blocks.json'))
  const importBack = compareBlocks(oldBlocks, newBlocks)
  console.log("%s blocks need to be minted on the old contract", importBack.length)
  fs.writeFileSync('old_MEH_blocks/2018_Import_Back.json', JSON.stringify(importBack, null, 2))

  // // const importBack = JSON.parse(fs.readFileSync('old_MEH_blocks/2018_Import_Back.json'))
  const overlap = await checkLandlords(importBack, oldMehContract)
  if (overlap.length > 0) {
    console.log("Warning!!! Old MEH and 2018 MEH got overlap")
    fs.writeFileSync('old_MEH_blocks/overlap.json', JSON.stringify(overlap, null, 2))
  } else {
    console.log("Checked if to-be-imported blocks have owners on Old MEH. No owners found as expected.")
  }

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
