const fs = require('fs')
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");
const { setupTestEnvironment } = require("../src/deployer.js")
const { rand1to100, blockID, countBlocks, balancesSnapshot } = require("../src/test-helpers.js")
const { getImpersonatedSigner } = require("../src/tools.js")
const conf = require('../conf.js');
const { BigNumber } = require('ethers');

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
let mintingPrice = ethers.utils.parseEther("1") 

let availableAreas = [
  {fx: 1, fy: 24, tx: 1, ty: 24}, // single
  {fx: 2, fy: 24, tx: 2, ty: 25}  // range
]

let areas2016 = [
  {fx: 51, fy: 35, tx: 51, ty: 35}, // single
  {fx: 50, fy: 34, tx: 50, ty: 35}, // range
]

// function to share deployment sequence between blocks of tests
// Solution from here https://stackoverflow.com/a/26111323
function makeSuite(name, tests) {
  describe(name, function () {
    before('setup', async () => {
      ;[ownerGlobal, buyer] = await ethers.getSigners()
      let env = await setupTestEnvironment({isDeployingMocks: IS_DEPLOYING_MOCKS, isDeployingMinterAdapter: true})
      owner = env.owner
      wrapper = env.mehWrapper
      referrals= env.referrals
      oldMeh = env.oldMeh
      // newMeh = env.newMeh

      founder_address = await wrapper.founder()
      buyer = owner
    })
      this.timeout(142000)
      tests();
  });
}

makeSuite("Reading contract", function () {

  it("Cannot wrap blocks with wrong input", async function () {
    const w = bb16[0]  // block to wrap
    let landlord = await getImpersonatedSigner(w.landlord)
    let sellPrice = ethers.utils.parseEther("1")
    await setBalance(landlord.address, ethers.utils.parseEther("2"));
    
    // wrong value provided
    await expect(
      wrapper.connect(landlord).wrap(w.x, w.y, w.x, w.y, { value: sellPrice.add(1) }))
      .to.be.revertedWith("Sending wrong amount of ether")
    await expect(
      wrapper.connect(landlord).wrap(w.x, w.y, w.x, w.y, { value: sellPrice.sub(1) }))
      .to.be.revertedWith("Sending wrong amount of ether")
    
    // trying to wrap area which is not minted yet
    const wa = availableAreas[0]
    await expect(
      wrapper.connect(landlord).wrap(wa.fx, wa.fy, wa.tx, wa.ty, { value: mintingPrice }))
      .to.be.revertedWith("Area is not minted yet")
  })

  function txGas(receipt) {
    return receipt.gasUsed.mul(receipt.effectiveGasPrice)
  }

  for (let w of areas2016) {
    it(`Can wrap single block (${w.fx}, ${w.fy}, ${w.tx}, ${w.ty})`, async function () {
      ;[landlordAddress, u, s] = await oldMeh.getBlockInfo(w.fx, w.fy);
 
      let landlord = await getImpersonatedSigner(landlordAddress)
      let pricePerBlock = ethers.utils.parseEther("1")
      let blocksCount = countBlocks(w.fx, w.fy, w.tx, w.ty)
      let sellPrice = (pricePerBlock).mul(blocksCount)
      await setBalance(landlord.address, sellPrice.add(ethers.utils.parseEther("2")));
      
      const landlordBalBefore = await ethers.provider.getBalance(landlord.address)
      // set block(s) for sale (pricePerBlock - price for each block)
      let sellTx = await oldMeh.connect(landlord).sellBlocks(w.fx, w.fy, w.tx, w.ty, pricePerBlock)
      // wrap (sending appropriate sell price)
      let wrapTx = await wrapper.connect(landlord).wrap(w.fx, w.fy, w.tx, w.ty, { value: sellPrice })
      // return money from wrapper
      let withdrawTx = await oldMeh.connect(landlord).withdrawAll()
      const landlordBalAfter = await ethers.provider.getBalance(landlord.address)

      let totalGas = new BigNumber.from("0")
      totalGas = totalGas.add(txGas((await sellTx.wait())))
      totalGas = totalGas.add(txGas((await wrapTx.wait())))
      totalGas = totalGas.add(txGas((await withdrawTx.wait())))

      // gas is calculated approximately. letting 100 wei slip
      expect(landlordBalBefore - landlordBalAfter - totalGas).to.be.lessThan(200)
      expect((await oldMeh.getBlockInfo(w.fx, w.fy)).landlord).to.equal(wrapper.address)
      expect(await wrapper.ownerOf(blockID(w.fx, w.fy))).to.equal(landlord.address)
      // do range
    })
  }
})