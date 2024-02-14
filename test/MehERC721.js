const fs = require('fs')
const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");
const { setupTestEnvironment } = require("../src/deployer.js")
const { blockID, countBlocks, balancesSnapshot, getTotalGas } = require("../src/test-helpers.js")
const { getImpersonatedSigner } = require("../src/tools.js")
const conf = require('../conf.js');
const { BigNumber } = require('ethers');


/// EXAMPLE FOR WRAPPER UX ↓↓↓


const BLOCKS_FROM_2018_PATH = conf.BLOCKS_FROM_2018_PATH
const BLOCKS_FROM_2016_PATH = conf.BLOCKS_FROM_2016_PATH
const IS_DEPLOYING_MOCKS_FOR_TESTS = conf.IS_DEPLOYING_MOCKS_FOR_TESTS
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
      ;[ownerGlobal, buyer, friend, joker] = await ethers.getSigners()
      let env = await setupTestEnvironment({isDeployingMocksForTets: IS_DEPLOYING_MOCKS_FOR_TESTS, isDeployingMinterAdapter: true})
      owner = env.owner
      wrapper = env.mehWrapper
      referrals= env.referrals
      oldMeh = env.oldMeh
      founder_address = await wrapper.founder()
    })
      this.timeout(142000)
      tests();
  });
}

makeSuite("Wrapping and unwrapping", function () {

  it("Cannot wrap blocks with wrong input", async function () {
    const w = bb16[0]  // block to wrap
    let landlord = await getImpersonatedSigner(w.landlord)
    let sellPrice = ethers.utils.parseEther("1")
    await setBalance(landlord.address, ethers.utils.parseEther("2"));
    
    // trying to wrap area which is not minted yet
    const wa = availableAreas[0]
    await expect(
      wrapper.connect(landlord).wrap(wa.fx, wa.fy, wa.tx, wa.ty, { value: mintingPrice }))
      .to.be.revertedWith("MehERC721: Area is not minted yet")

    // wrong value provided
    let sellTx = await oldMeh.connect(landlord).sellBlocks(w.x, w.y, w.x, w.y, sellPrice)
    await expect(
      wrapper.connect(landlord).wrap(w.x, w.y, w.x, w.y, { value: sellPrice.add(1) }))
      .to.be.revertedWith("MehERC721: Sending wrong amount of ether")
    await expect(
      wrapper.connect(landlord).wrap(w.x, w.y, w.x, w.y, { value: sellPrice.sub(1) }))
      .to.be.revertedWith("MehERC721: Sending wrong amount of ether")
  })





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

      let totalGas = await getTotalGas([sellTx, wrapTx, withdrawTx])

      // gas is calculated approximately. letting 100 wei slip
      expect(landlordBalBefore - landlordBalAfter - totalGas).to.be.within(-gasCalculationAccuracy, gasCalculationAccuracy)
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
      // 2. Sign in to oldMEH (if not yet signed in)
      // await oldMeh.connect(landlord).signIn(conf.mehAdminAddress)

      // 3. Buy blocks on oldMeh by landlord
      let buyTx = await oldMeh.connect(landlord).buyBlocks(w.fx, w.fy, w.tx, w.ty, { value: sellPrice })
      expect((await oldMeh.getBlockInfo(w.fx, w.fy)).landlord).to.equal(landlord.address)
      let smid = await balancesSnapshot(oldMeh, wrapper, referrals)
      // eth moved from landlord to oldMeh contract
      expect((smid.meh).sub(sb.meh)).to.equal(sellPrice)

      // 4. Set new sellprice on oldMeh.
      // WARNING Sell price:
      // - cannot be 0
      // - must be big enough to prevent others from buying it cheap (if the landlord wants to keep the blocks)
      let hugePrice = ethers.utils.parseEther("1000000000")
      let sellTx = await oldMeh.connect(landlord).sellBlocks(w.fx, w.fy, w.tx, w.ty, hugePrice)
      
      // 5. Withdraw money from wrapper
      let withdrawTx = await wrapper.connect(landlord).withdraw(w.fx, w.fy, w.tx, w.ty)
      const landlordBalAfter = await ethers.provider.getBalance(landlord.address)
      let sa = await balancesSnapshot(oldMeh, wrapper, referrals)
      expect((smid.meh).sub(sa.meh)).to.equal(sellPrice) // eth moved from oldMeh to wrapper

      // calculating gas
      let totalGas = await getTotalGas([unwrapTx, buyTx, sellTx, withdrawTx])

      expect(sa.wrapper.sub(sb.wrapper)).to.equal(0)  // all money is returned
      expect(sa.meh.sub(sb.meh)).to.equal(0)
      expect(oldMehExBalance + landlordBalBefore - landlordBalAfter - totalGas).to.be.within(-gasCalculationAccuracy, gasCalculationAccuracy)

      // expect(await wrapper.ownerOf(blockID(w.fx, w.fy))).to.equal(ZERO_ADDRESS)
      await expect(wrapper.ownerOf(blockID(w.fx, w.fy))).to.revertedWith(
        "ERC721: owner query for nonexistent token")
    })
  }
})



// wrapper must set new sell price to a wrapped block so that nobody can buy it. 
makeSuite("Other", function () {

  it(`Cannot buy wrapped block again`, async function () {
    const w = areas2016[0]  // block to wrap

    ;[landlordAddress, u, s] = await oldMeh.getBlockInfo(w.fx, w.fy);

    let landlord = await getImpersonatedSigner(landlordAddress)
    let pricePerBlock = ethers.utils.parseEther("1")
    await setBalance(landlord.address, pricePerBlock.mul(3));
    
    let sellTx = await oldMeh.connect(landlord).sellBlocks(w.fx, w.fy, w.fx, w.fy, pricePerBlock)
    let wrapTx = await wrapper.connect(landlord).wrap(w.fx, w.fy, w.fx, w.fy, { value: pricePerBlock })
    
    // sell price must be set ot a prohibitary value so noine could buy the wrapped block
    // from oldMeh
    let max_uint = (new BigNumber.from("2")).pow(256).sub(1)
    expect((await oldMeh.getBlockInfo(w.fx, w.fy)).sellPrice).to.equal(max_uint)
    await expect(oldMeh.connect(landlord).buyBlocks(w.fx, w.fy, w.fx, w.fy, { value: pricePerBlock })).to.be.revertedWithoutReason()

    // wrapper itself cannot buy blocks again
    await expect(wrapper.connect(landlord).wrap(w.fx, w.fy, w.fx, w.fy, { value: pricePerBlock }))
      .to.be.revertedWith("MehERC721: Sending wrong amount of ether")

    expect((await oldMeh.getBlockInfo(w.fx, w.fy)).landlord).to.equal(wrapper.address)
    expect(await wrapper.ownerOf(blockID(w.fx, w.fy))).to.equal(landlord.address)
    // WARNING!!! Next test is using the remaining state
  })

  // WARNING!!! State remains from previuos test
  it(`Funds are sent to landlord, that unwrapped block`, async function () {
    const w = areas2016[0]  // block to wrap
    let landlordAddress = await wrapper.ownerOf(blockID(w.fx, w.fy))
    let landlord = await getImpersonatedSigner(landlordAddress)
    let pricePerBlock = ethers.utils.parseEther("1")
    await setBalance(landlord.address, pricePerBlock.mul(3));
    
    let unwrapTx = await wrapper.connect(landlord).unwrap(w.fx, w.fy, w.fx, w.fy, pricePerBlock)
    let buyTx = await oldMeh.connect(landlord).buyBlocks(w.fx, w.fy, w.fx, w.fy, { value: pricePerBlock })

    let sb = await balancesSnapshot(oldMeh, wrapper, referrals)
    let landlordBalBefore = await ethers.provider.getBalance(landlord.address)
    let jokerBalBefore = await ethers.provider.getBalance(joker.address)

    let withdrawTx = await wrapper.connect(joker).withdraw(w.fx, w.fy, w.fx, w.fy)

    let gas = await getTotalGas([withdrawTx])
    let landlordBalAfter = await ethers.provider.getBalance(landlord.address)
    let jokerBalAfter = await ethers.provider.getBalance(joker.address)
    let sa = await balancesSnapshot(oldMeh, wrapper, referrals)

    expect(sb.meh.sub(sa.meh)).to.equal(pricePerBlock) // withdrawn from meh
    expect(sa.wrapper.sub(sb.wrapper)).to.equal(0)  // no changes on wrapper 
    expect(landlordBalAfter.sub(landlordBalBefore)).to.equal(pricePerBlock) // all money are returned to landlord
    expect((jokerBalBefore.sub(jokerBalAfter))).to.equal(gas) // joker spent gas
    let deletedReceipt = await wrapper.receipts(blockID(w.fx, w.fy))
    expect(deletedReceipt.isAwaitingWithdrawal).to.be.equal(false)
  })
})
  

makeSuite("Multiple recipients", function () {

  // this check needs to be done at wrapping (not unwrapping)
  // because withdrawal checks blocks ownership
  // it will only issue a payment if block does not belong to wrapper
  it("Cannot wrap blocks while a receipt is active", async function () {
    const w = bb16[0]  // getting a landlord which is already signed in
    const cc = availableAreas[0]
    let landlord = await getImpersonatedSigner(w.landlord)
    let price = await wrapper.crowdsalePrice();
    let unwrapPrice = ethers.utils.parseEther("1")
    await setBalance(landlord.address, unwrapPrice.mul(unwrapPrice.mul(2)))

    // buy range
    await wrapper.connect(landlord)
    // TODO is this really a range - check coords
        .buyBlocks(cc.fx, cc.fy, cc.fx, cc.fy, { value: price })

    // unwrap - buy - wrap 
    let unwrapTxLandlord = await wrapper.connect(landlord).unwrap(cc.fx, cc.fy, cc.fx, cc.fy, unwrapPrice)
    let buyTxLandlord = await oldMeh.connect(landlord).buyBlocks(cc.fx, cc.fy, cc.fx, cc.fy, { value: unwrapPrice })
    // let wrapTxLandlord = await wrapper.connect(landlord).wrap(cc.fx, cc.fy, cc.fx, cc.fy, { value: unwrapPrice })

    await expect(wrapper.connect(landlord).wrap(cc.fx, cc.fy, cc.fx, cc.fy, { value: unwrapPrice }))
      .to.be.revertedWith("MehERC721: Must withdraw receipt first")
  })

  it("Cannot withdraw when multiple recipients within area", async function () {
    const w = bb16[0]  // getting a landlord which is already signed in
    const cc = availableAreas[1]
    let landlord = await getImpersonatedSigner(w.landlord)
    let price = await wrapper.crowdsalePrice();
    let count = countBlocks(cc.fx, cc.fy, cc.tx, cc.ty)
    let total = price.mul(count)
    let unwrapPrice = ethers.utils.parseEther("1")
    await setBalance(landlord.address, unwrapPrice.mul(count + 2))

    // buy range
    await wrapper.connect(landlord)
        .buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: total })
    // transfer 1 block to another account
    let transferTx = await wrapper.connect(landlord).transferFrom(landlord.address, friend.address, blockID(cc.tx, cc.ty))

    // unwrap - buy
    let unwrapTxLandlord = await wrapper.connect(landlord).unwrap(cc.fx, cc.fy, cc.fx, cc.fy, unwrapPrice)
    let buyTxLandlord = await oldMeh.connect(landlord).buyBlocks(cc.fx, cc.fy, cc.fx, cc.fy, { value: unwrapPrice })
    let unwrapTxFriend = await wrapper.connect(friend).unwrap(cc.tx, cc.ty, cc.tx, cc.ty, unwrapPrice)
    let signInTxFriend = await oldMeh.connect(friend).signIn(conf.mehAdminAddress)
    let buyTxFriend = await oldMeh.connect(friend).buyBlocks(cc.tx, cc.ty, cc.tx, cc.ty, { value: unwrapPrice })

    // try withdrawing the whole area
    await expect(wrapper.connect(landlord).withdraw(cc.fx, cc.fy, cc.tx, cc.ty))
      .to.be.revertedWith("MehERC721: Multiple recipients within area")
  })
})

makeSuite("Withdraw one by one", function () {

  // this check needs to be done at wrapping (not unwrapping)
  // because withdrawal checks blocks ownership
  // it will only issue a payment if block does not belong to wrapper
  it("Can withdraw block receipts one by one", async function () {
    const w = bb16[0]  // getting a landlord which is already signed in
    const cc = availableAreas[1]
    let landlord = await getImpersonatedSigner(w.landlord)

    let price = await wrapper.crowdsalePrice();
    let count = countBlocks(cc.fx, cc.fy, cc.tx, cc.ty)
    let total = price.mul(count)

    let unwrapPrice = ethers.utils.parseEther("1")
    let totUnwrapPrice = unwrapPrice.mul(count)

    await setBalance(landlord.address, ethers.utils.parseEther("10"))

    // buy range
    await wrapper.connect(landlord)
        .buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: total })

    // unwrap - buy - wrap 
    await wrapper.connect(landlord).unwrap(cc.fx, cc.fy, cc.tx, cc.ty, unwrapPrice)
    await oldMeh.connect(landlord).buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: totUnwrapPrice })

    // withdraw in separate transactions
    const landlordBalBefore = await ethers.provider.getBalance(landlord.address)
    let tx1 = await wrapper.connect(landlord).withdraw(cc.fx, cc.fy, cc.fx, cc.fy)
    expect(await wrapper.unclaimed()).to.be.equal(unwrapPrice)
    expect(await wrapper.numOfReceipts()).to.be.equal(1)
    await expect(wrapper.connect(owner).rescueUnclaimed())
      .to.be.revertedWith("MehERC721: rescue conditions are not met")

    let tx2 = await wrapper.connect(landlord).withdraw(cc.tx, cc.ty, cc.tx, cc.ty)
    expect(await wrapper.unclaimed()).to.be.equal(0)
    expect(await wrapper.numOfReceipts()).to.be.equal(0)
    const landlordBalAfter = await ethers.provider.getBalance(landlord.address)
    let totalGas = await getTotalGas([tx1,tx2])
    expect(landlordBalAfter.sub(landlordBalBefore)).to.equal(totUnwrapPrice.sub(totalGas))
  })
})

// similar test is for minter.sol
makeSuite("Minting from oldMeh directly", function () {
  // makes funds rescue possible
  it("funds are separated", async function () {
    let mintingPrice = ethers.utils.parseEther("1")
    let unwrapPrice = mintingPrice.mul(2)
    let crowdsalePrice = await wrapper.crowdsalePrice();

    // mint and unwrap a block (single) then buy it on meh2016
    let s1 = await balancesSnapshot(oldMeh, wrapper, referrals)
    let mm = availableAreas[1]
    let mintingTx = await wrapper.connect(buyer).buyBlocks(mm.fx, mm.fy, mm.fx, mm.fy, { value: crowdsalePrice })
    let unwrapTx = await wrapper.connect(buyer).unwrap(mm.fx, mm.fy, mm.fx, mm.fy, unwrapPrice)
    let signInTxbuyer = await oldMeh.connect(buyer).signIn(conf.mehAdminAddress)
    await oldMeh.connect(buyer).buyBlocks(mm.fx, mm.fy, mm.fx, mm.fy, { value: unwrapPrice })
    let s2 = await balancesSnapshot(oldMeh, wrapper, referrals)

    // INTERFERE
    // minting at oldMeh directly (creating excess referrals balace)
    // 50% goes to mehAdminAddress, the rest from this sale should go to royalties
    let cc = availableAreas[0]
    let signInTxFriend = await oldMeh.connect(joker).signIn(conf.mehAdminAddress)
    await oldMeh.connect(joker).buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: mintingPrice })
    let s3 = await balancesSnapshot(oldMeh, wrapper, referrals)
    // oldMeh now stores funds from unwrap and minting transaction 
    expect(s3.meh.sub(s1.meh)).to.equal(unwrapPrice.add(mintingPrice))

    // now try to finish unwrap procedure - withdraw funds
    let withdrawTx = await wrapper.connect(buyer).withdraw(mm.fx, mm.fy, mm.fx, mm.fy)
    let s4 = await balancesSnapshot(oldMeh, wrapper, referrals)
    let referralSurplus = mintingPrice.div(2) // 50% is collected from charity
    // unwrap price is withdrawn from meh (not withdrawing from referrals)
    expect(s3.meh.sub(s4.meh)).to.equal(unwrapPrice)

    expect(await wrapper.unclaimed()).to.be.equal(0)
    expect(await wrapper.numOfReceipts()).to.be.equal(0)
  })
})

// similar test is for minter.sol
makeSuite("Resetting sell price", function () {
  // makes funds rescue possible
  it("funds are separated", async function () {
    const w = bb16[0]  // getting a landlord which is already signed in
    const cc = availableAreas[1]
    let landlord = await getImpersonatedSigner(w.landlord)
    let price = await wrapper.crowdsalePrice();
    let count = countBlocks(cc.fx, cc.fy, cc.tx, cc.ty)
    let total = price.mul(count)
    let unwrapPrice = ethers.utils.parseEther("1")
    await setBalance(landlord.address, ethers.utils.parseEther("10"))
    // mint 2 blocks
    await wrapper.connect(landlord)
        .buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: total })
    // set both for sale 
    await wrapper.connect(landlord).unwrap(cc.fx, cc.fy, cc.tx, cc.ty, unwrapPrice)
    // reset sell price for second block 
    let newUnwrapPrice = ethers.utils.parseEther("1.22")
    let newTotUnwrapPrice = unwrapPrice.add(newUnwrapPrice)
    await wrapper.connect(landlord).resetSellPrice(cc.tx, cc.ty, cc.tx, cc.ty, newUnwrapPrice)
    expect((await wrapper.receipts(blockID(cc.fx, cc.fy))).sellPrice).to.be.equal(unwrapPrice)
    expect((await wrapper.receipts(blockID(cc.tx, cc.ty))).sellPrice).to.be.equal(newUnwrapPrice)
    // buy both blocks on meh 
    await oldMeh.connect(landlord).buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: newTotUnwrapPrice })
    // try resetting price again
    await expect(wrapper.connect(landlord).resetSellPrice(cc.tx, cc.ty, cc.tx, cc.ty, newUnwrapPrice))
      .to.be.revertedWithoutReason()
    // withdraw 
    const landlordBalBefore = await ethers.provider.getBalance(landlord.address)
    let tx1 = await wrapper.connect(landlord).withdraw(cc.fx, cc.fy, cc.tx, cc.ty)
    const landlordBalAfter = await ethers.provider.getBalance(landlord.address)
    await expect(wrapper.connect(landlord).resetSellPrice(cc.tx, cc.ty, cc.tx, cc.ty, newUnwrapPrice))
      .to.be.revertedWith("MehERC721: Not a recipient")
    let totalGas = await getTotalGas([tx1])

    expect(landlordBalAfter.sub(landlordBalBefore)).to.equal(newTotUnwrapPrice.sub(totalGas))
  })
})