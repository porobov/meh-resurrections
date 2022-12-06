const fs = require('fs')
const BigNumber = require ("ethers")
const conf = require('../conf.js')

/// READING EVENTS
// npx hardhat run scripts/export_old_ads.js

// reads old MEH events both 2016 and 2018 contracts 
// saves on disk
// event NewImage(uint ID, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY, string imageSourceUrl, string adUrl, string adText);

function readFromDisk(filePath) {
    try {
        console.log("reading from disk: ", filePath)
        return oldBlocksDuplicates = JSON.parse(fs.readFileSync(filePath))
    } catch (error) {
        if (error.code == 'ENOENT') {
            console.log("File is not yet there...")
            return null
        }
        throw error;
    }
}

async function readOldMehEvents(oldMeh) {
  const eventFilter = oldMeh.filters.NewImage()
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
      imageSourceUrl: event.args.imageSourceUrl.toString(),
      adUrl: event.args.adUrl.toString(),
      adText: event.args.adText.toString()
    })
  }
  return data
}

// read 2018 MEH events
// event LogAds(uint ID, uint8 fromX,uint8 fromY,uint8 toX,uint8 toY,string imageSourceUrl,string adUrl,string adText,address indexed advertiser);
async function readNewMehEvents(newMeh) {
    const eventFilter = newMeh.filters.LogAds()
    const newAreaStatusEvents = await newMeh.queryFilter(eventFilter)
    const data = []
    for (const event of newAreaStatusEvents) {
      data.push({
        blockNumber: event.blockNumber,
        ID: event.args.ID.toString(), 
        fromX: event.args.fromX,
        fromY: event.args.fromY,
        toX: event.args.toX,
        toY: event.args.toY,
        imageSourceUrl: event.args.imageSourceUrl.toString(),
        adUrl: event.args.adUrl.toString(),
        adText: event.args.adText.toString(),
        advertiser: event.args.advertiser.toString()
      })
    }
    return data
  }

async function main() {
    const oldMehAbi = conf.oldMehAbi
    const newMehAbi = conf.newMehAbi
    const oldMehAddress = conf.oldMehAddress
    const newMehAddress = conf.newMehAddress
  
    signer = (await ethers.getSigners())[0]
    console.log("Starting with singer address", signer.address)
  
    const oldMehContract = new ethers.Contract(oldMehAddress, oldMehAbi, signer)
    
    // reading Ads events from 2016 contract
    const oldMehEventsPath = 'old_MEH_blocks/data/Old_NewImage_Events.json'
    const oldMehEventsDisk = readFromDisk(oldMehEventsPath)
    const oldMehEvents = oldMehEventsDisk ? oldMehEventsDisk : await readOldMehEvents(oldMehContract)
    fs.writeFileSync(oldMehEventsPath, JSON.stringify(oldMehEvents, null, 2))
    console.log("Loaded %s NewImage events from Old MEH contract", oldMehEvents.length)


    const newMehContract = new ethers.Contract(newMehAddress, newMehAbi, signer)

    // reading Ads events from 2018 contract
    const newMehEventsPath = 'old_MEH_blocks/data/2018_LogAds_Events.json'
    const newMehEventsDisk = readFromDisk(newMehEventsPath)
    const newMehEvents = newMehEventsDisk ? newMehEventsDisk : await readNewMehEvents(newMehContract)
    fs.writeFileSync(newMehEventsPath, JSON.stringify(newMehEvents, null, 2))
    console.log("Loaded %s LogAds events from New MEH contract", newMehEvents.length)
}  

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
