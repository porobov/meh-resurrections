// Populates newly deployed meh project with old data.
// needed for ux dev. To be used locally and for testnets
// npx hardhat run scripts/populate_wrapper.js --network localhost

const fs = require('fs')
const { ethers } = require("hardhat")
const { Constants } = require("../src/deployer.js")
const { countBlocks } = require("../src/test-helpers.js")
const { getConfigChainID, getConfigNumConfirmations } = require("../src/tools.js")
const chalk = require('chalk');

const ADS_PATH = "old_MEH_blocks/data/Old_NewImage_Events.json"
const FIRST_ID = 1
const LAST_ID = 10

const ads = JSON.parse(fs.readFileSync(ADS_PATH))

async function populate() {

    // prepare
    ;[landlord] = await ethers.getSigners()
    const chainID = getConfigChainID()
    const consts = new Constants(chainID)
    const numConf = getConfigNumConfirmations(chainID)
    const wrapper = await ethers.getContractAt("MehWrapper", consts.constants.wrapperAddresses)

    // populate
    for (let i = FIRST_ID; i <= LAST_ID; i++) {
        const ad = ads[i]
        console.log("\nAds id", i, "Coords", ad.fromX, ad.fromY, ad.toX, ad.toY, "ads:", ad.imageSourceUrl, ad.adUrl, ad.adText)

        // calculate price
        const [fx, tx, fy, ty] = [ad.fromX, ad.toX, ad.fromY, ad.toY]
        let price = await wrapper.crowdsalePrice();
        let count = countBlocks(fx, fy, tx, ty)
        let total = price.mul(count)

        // buy range
        // using try-catch here because there may be multiple ads put at the same area
        // we don't need precision here
        try {
            const mintTx = await wrapper.connect(landlord).buyBlocks(fx, fy, tx, ty, { value: total })
            console.log(chalk.gray("Minting tx:", mintTx?.hash))
            const mintReciept = await mintTx.wait(numConf)
            console.log(chalk.green("mintReciept:", mintReciept?.transactionHash))
        } catch (e) {
            console.log(chalk.red(e?.reason))
        }
        try {
            const placeImageTx = await wrapper.connect(landlord).placeImage(fx, fy, tx, ty, ad.imageSourceUrl, ad.adUrl, ad.adText)
            console.log(chalk.gray("Place image tx:", placeImageTx?.hash))
            const placeImageReceipt = await placeImageTx.wait(numConf)
            console.log(chalk.green("placeImageReceipt:", placeImageReceipt?.transactionHash))
        } catch (e) {
            console.log(chalk.red(e?.reason))
        }
    }
}

populate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });