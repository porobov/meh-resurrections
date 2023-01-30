const fs = require('fs')
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");
const { setupTestEnvironment } = require("../src/deployer.js")
const { rand1to100, blockID, countBlocks, balancesSnapshot } = require("../src/test-helpers.js")
const { getImpersonatedSigner } = require("../src/tools.js")
const conf = require('../conf.js');
const { BigNumber } = require('ethers');
const { zeroPad } = require('ethers/lib/utils.js');
const { abort } = require('process');


/// EXAMPLE FOR WRAPPER UX ↓↓↓


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
let gasCalculationAccuracy = 300

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



  /// EXAMPLE FOR WRAPPER UX (see numbered list of transactions)
  for (let w of areas2016) {
    it(`Can wrap blocks (${w.fx}, ${w.fy}, ${w.tx}, ${w.ty})`, async function () {
      ;[landlordAddress, u, s] = await oldMeh.getBlockInfo(w.fx, w.fy);
 
      let landlord = await getImpersonatedSigner(landlordAddress)
      let pricePerBlock = ethers.utils.parseEther("1")
      let blocksCount = countBlocks(w.fx, w.fy, w.tx, w.ty)
      let sellPrice = (pricePerBlock).mul(blocksCount)
      await setBalance(landlord.address, sellPrice.add(ethers.utils.parseEther("2")));
      
      const landlordBalBefore = await ethers.provider.getBalance(landlord.address)

      // Transactions to wrap a 2016 block:

      // 1. Set block(s) for sale (pricePerBlock - price for each block)
      let sellTx = await oldMeh.connect(landlord).sellBlocks(w.fx, w.fy, w.tx, w.ty, pricePerBlock)
      
      // 2. Wrap (send total sell price in value)
      let wrapTx = await wrapper.connect(landlord).wrap(w.fx, w.fy, w.tx, w.ty, { value: sellPrice })
      
      // 3. Withdraw money from oldMeh
      let withdrawTx = await oldMeh.connect(landlord).withdrawAll()
      const landlordBalAfter = await ethers.provider.getBalance(landlord.address)

      let totalGas = new BigNumber.from("0")
      totalGas = totalGas.add(txGas((await sellTx.wait())))
      totalGas = totalGas.add(txGas((await wrapTx.wait())))
      totalGas = totalGas.add(txGas((await withdrawTx.wait())))

      // gas is calculated approximately. letting 100 wei slip
      expect(landlordBalBefore - landlordBalAfter - totalGas).to.be.lessThan(gasCalculationAccuracy)
      expect((await oldMeh.getBlockInfo(w.fx, w.fy)).landlord).to.equal(wrapper.address)
      expect(await wrapper.ownerOf(blockID(w.fx, w.fy))).to.equal(landlord.address)
      // do range
    })
  }

  // WARNING!!! State remains from previuos test
  /// EXAMPLE FOR UNWRAPPER UX (see numbered list of transactions)
  for (let w of areas2016) {
    it(`Can UNwrap blocks (${w.fx}, ${w.fy}, ${w.tx}, ${w.ty})`, async function () {
      let landlordAddress = await wrapper.ownerOf(blockID(w.fx, w.fy));
 
      let landlord = await getImpersonatedSigner(landlordAddress)
      let pricePerBlock = ethers.utils.parseEther("1")
      let blocksCount = countBlocks(w.fx, w.fy, w.tx, w.ty)
      let sellPrice = (pricePerBlock).mul(blocksCount)
      await setBalance(landlord.address, sellPrice.add(ethers.utils.parseEther("2")));
      
      let sb = await balancesSnapshot(oldMeh, wrapper, referrals)
      const landlordBalBefore = await ethers.provider.getBalance(landlord.address)
      ;[oldMehExBalance, activationTime] = await oldMeh.connect(landlord).getMyInfo()

      // Transactions to unwrap a 2016 block (recaliming ownership on 2016 contract):

      // 1. Unwrap (sending appropriate sell price)
      let unwrapTx = await wrapper.connect(landlord).unwrap(w.fx, w.fy, w.tx, w.ty, pricePerBlock)
 
      // 2. Buy blocks on oldMeh by landlord
      let buyTx = await oldMeh.connect(landlord).buyBlocks(w.fx, w.fy, w.tx, w.ty, { value: sellPrice })
      expect((await oldMeh.getBlockInfo(w.fx, w.fy)).landlord).to.equal(landlord.address)
      let smid = await balancesSnapshot(oldMeh, wrapper, referrals)
      // eth moved from landlord to oldMeh contract
      expect((smid.meh).sub(sb.meh)).to.equal(sellPrice)

      // 3. Set new sellprice on oldMeh.
      // WARNING Sell price:
      // - cannot be 0
      // - must be different than the one used when unwrapping blocks (not equal pricePerBlock)
      // - must be big enough to prevent others from buying it cheap (if the landlord wants to keep the blocks)
      let hugePrice = ethers.utils.parseEther("1000000")
      let sellTx = await oldMeh.connect(landlord).sellBlocks(w.fx, w.fy, w.tx, w.ty, hugePrice)
      
      // 4. Withdraw money from wrapper
      let withdrawTx = await wrapper.connect(landlord).withdraw(w.fx, w.fy, w.tx, w.ty)
      const landlordBalAfter = await ethers.provider.getBalance(landlord.address)
      let sa = await balancesSnapshot(oldMeh, wrapper, referrals)
      expect((smid.meh).sub(sa.meh)).to.equal(sellPrice) // eth moved from oldMeh to wrapper

      // calculating gas
      let totalGas = new BigNumber.from("0")
      totalGas = totalGas.add(txGas((await unwrapTx.wait())))
      totalGas = totalGas.add(txGas((await buyTx.wait())))
      totalGas = totalGas.add(txGas((await sellTx.wait())))
      totalGas = totalGas.add(txGas((await withdrawTx.wait())))

      expect(sa.wrapper.sub(sb.wrapper)).to.equal(0)  // all money is returned
      expect(sa.meh.sub(sb.meh)).to.equal(0)
      expect(oldMehExBalance + landlordBalBefore - landlordBalAfter - totalGas).to.be.lessThan(gasCalculationAccuracy)

      // expect(await wrapper.ownerOf(blockID(w.fx, w.fy))).to.equal(ZERO_ADDRESS)
      await expect(wrapper.ownerOf(blockID(w.fx, w.fy))).to.revertedWith(
        "ERC721: owner query for nonexistent token")
    })
  }
})