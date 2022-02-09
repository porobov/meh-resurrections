const hre = require("hardhat");
const fs = require('fs')
const BigNumber = require ("ethers")
const conf = require('../conf.js')

const oldMehAbi = conf.oldMehAbi
const newMehAbi = conf.newMehAbi
const oldMehAddress = conf.oldMehAddress
const newMehAddress = conf.newMehAddress
let oldMeh
let newMeh

async function readOldMehEvents() {
  const eventFilter = oldMeh.filters.NewAreaStatus()
  const newAreaStatusEvents = await oldMeh.queryFilter(eventFilter)
  // console.log(newAreaStatusEvents)
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
  // fs.writeFileSync('NewAreaStatus.js', JSON.stringify(await readOldMehEvents()))
  return data
}

async function readNewMehEvents() {
  const eventFilter = newMeh.filters.LogBuys()
  const newAreaStatusEvents = await newMeh.queryFilter(eventFilter)
  
  // emit LogBuys(id, fromX, fromY, toX, toY, msg.sender);
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
  fs.writeFileSync('data/2018_LogBuys.json', JSON.stringify(data, null, 2))
  return data
}

function extractOldBlocks() {
  const events = JSON.parse(fs.readFileSync('NewAreaStatus.js'))
  const buyEvents = events.filter(event => { return event.price == '0' });
  const blocks = []
  for (const buyEvent of buyEvents) {
    for (let x = buyEvent.fromX; x <= buyEvent.toX; x++) {
      for (let y = buyEvent.fromY; y <= buyEvent.toY; y++) {
        blocks.push({x: x, y: y})
      }
    }
  }
  fs.writeFileSync('data/oldBlocks.json', JSON.stringify(blocks))
}

function extractNewBlocks() {
  const events = JSON.parse(fs.readFileSync('data/2018_LogBuys.json'))
  const blocks = []
  for (const buyEvent of events) {
    for (let x = buyEvent.fromX; x <= buyEvent.toX; x++) {
      for (let y = buyEvent.fromY; y <= buyEvent.toY; y++) {
        blocks.push({x: x, y: y, landlord: buyEvent.landlord})
      }
    }
  }
  fs.writeFileSync('data/2018_Blocks.json', JSON.stringify(blocks, null, 2))
}

async function querryOldLandlords(oldMeh) {
  const oldBlocks = JSON.parse(fs.readFileSync('data/oldBlocks.json'))
  const blocks = []
  for (const oldBlock in oldBlocks) {
    const x = oldBlocks[oldBlock].x
    const y = oldBlocks[oldBlock].y
    const info = await oldMeh.getBlockInfo(x,y)
    blocks.push({x: x, y: y, landlord: info.landlord})
    console.log(info.sellPrice)
  }
  fs.writeFileSync('data/oldBlocksLandlords.json', JSON.stringify(blocks, null, 2))
}

function countBlocks() {
  const oldBlocks = JSON.parse(fs.readFileSync('data/oldBlocksLandlords.json'))
  const newBlocks = JSON.parse(fs.readFileSync('data/2018_Blocks.json'))
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
  fs.writeFileSync('data/importBack.json', JSON.stringify(importBack, null, 2))
  console.log(countSame, newBlocks.length, importBack.length)
}

async function checkLandlords(oldMeh) {
  const blocksForImport = JSON.parse(fs.readFileSync('data/importBack.json'))
  const blocks = []
  for (const block of blocksForImport) {
    const x = block.x
    const y = block.y
    const info = await oldMeh.getBlockInfo(x,y)
    // blocks.push({x: x, y: y, landlord: info.landlord})
    console.log(info.landlord)
  }
  // fs.writeFileSync('data/oldBlocksLandlords.json', JSON.stringify(blocks, null, 2))
}

function findDuplicates() {
  const oldBlocks = JSON.parse(fs.readFileSync('data/oldBlocksLandlords.json'))
  const lib = []
  for (const block of oldBlocks) {
    const record = block.x + " " + block.y + " " + block.landlord
    const found = lib.find(element => element == record);
    if (found) {
      console.log(record, "=>", block.x, block.y, block.landlord)
      // 51 42 0x9AF5Ba5a5566bA95AFC13E790d80440f407aa1a8 => 51 42 0x9AF5Ba5a5566bA95AFC13E790d80440f407aa1a8
    } else {
      lib.push(record)
    }
  }
  const events = JSON.parse(fs.readFileSync('data/NewAreaStatus.js'))
  for (const buyEvent of events) {
    for (let x = buyEvent.fromX; x <= buyEvent.toX; x++) {
      for (let y = buyEvent.fromY; y <= buyEvent.toY; y++) {
        if (x == 51 && y == 42) {
          console.log(buyEvent)
        }
      }
    }
  }
  // block numbers 
  // buy at 3268010, sell at 3271089, 3990008, 4315564, buy at 4315567
}

async function main() {
  // signer = (await ethers.getSigners())[0]
  // oldMeh = new ethers.Contract(oldMehAddress, oldMehAbi, signer)
  // newMeh = new ethers.Contract(newMehAddress, newMehAbi, signer)

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
