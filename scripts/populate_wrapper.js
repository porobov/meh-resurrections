// This is to populate newly deployed meh project with old data.
// needed for ux dev
// npx hardhat run scripts/populate_wrapper.js

const fs = require('fs')
const { ethers } = require("hardhat")
const { ProjectEnvironment, Constants } = require("../src/deployer.js")
const { blockID, countBlocks, balancesSnapshot, getTotalGas } = require("../src/test-helpers.js")
const { GasReporter, increaseTimeBy, getConfigChainID, getConfigNumConfirmations, getImpersonatedSigner, resetHardhatToBlock, isLocalTestnet, isThisLiveNetwork } = require("../src/tools.js")

const ADS_PATH = "old_MEH_blocks/data/Old_NewImage_Events.json"
const FIRST_ID = 1
const LAST_ID = 1

const ads = JSON.parse(fs.readFileSync(ADS_PATH))

async function populate() {

    // prepare
    ;[landlord] = await ethers.getSigners()
    const chainID = getConfigChainID()
    const consts = new Constants(chainID)
    const numConf = getConfigNumConfirmations(chainID)
    const wrapper = await ethers.getContractAt("MehWrapper", consts.constants.wrapperAddresses)

    // populate
    for (const i = FIRST_ID; i <= LAST_ID; i++) {
        console.log("Puttig ads id:", i)
        console.log("buy", ad.fromX, ad.toX, ad.fromY, ad.toY)
        console.log("ads", ad.imageSourceUrl, ad.adUrl, ad.adText)

        // calculate price
        const ad = ads[i]
        const [fx, fy, tx, ty] = [ad.fromX, ad.toX, ad.fromY, ad.toY]
        let price = await wrapper.crowdsalePrice();
        let count = countBlocks(fx, fy, tx, ty)
        let total = price.mul(count)

        // buy range
        // using try-catch here because there may be multiple ads put at the same area
        // we don't need precision here
        console.log("Buying area:", fx, fy, tx, ty)
        try {
            const mintReciept = await(await wrapper.connect(landlord)
                .mint(fx, fy, tx, ty, { value: total })).wait(numConf)
            console.log(mintReciept)
        } catch (e) {
            console.log(e)
        }
    }
}

populate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });