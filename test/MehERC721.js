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
const RESERVED_FOR_FOUNDER = conf.RESERVED_FOR_FOUNDER
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const bb16 = JSON.parse(fs.readFileSync(BLOCKS_FROM_2016_PATH))
const bb18 = JSON.parse(fs.readFileSync(BLOCKS_FROM_2018_PATH))

let usingToolsAdapter
let founder_address
let mintingPrice = ethers.parseEther("1")
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
      const env = await setupTestEnvironment({isDeployingMinterAdapter: true})
      owner = env.owner
      wrapper = env.mehWrapper
      referrals= env.referrals
      oldMeh = env.oldMeh
      mehAdminAddress = env.mehAdminAddress
      founder_address = await wrapper.founder()
    })
      this.timeout(142000)
      tests();
  });
}

makeSuite("Wrapping and unwrapping", function () {

  it("(No-mocks env only). Cannot wrap blocks with wrong input", async function () {
    const w = bb16[0]  // block to wrap
    let landlord = await getImpersonatedSigner(w.landlord)
    let sellPrice = ethers.parseEther("1")
    await setBalance(landlord.address, ethers.parseEther("2"));
    
    // trying to wrap area which is not minted yet
    const wa = availableAreas[0]
    await expect(
      wrapper.connect(landlord).wrap(wa.fx, wa.fy, wa.tx, wa.ty, { value: mintingPrice }))
      .to.be.revertedWith("MehERC721: Area is not minted yet")

    // wrong value provided
    let sellTx = await oldMeh.connect(landlord).sellBlocks(w.x, w.y, w.x, w.y, sellPrice)
    await expect(
      wrapper.connect(landlord).wrap(w.x, w.y, w.x, w.y, { value: sellPrice + 1n }))
      .to.be.revertedWith("MehERC721: Sending wrong amount of ether")
    await expect(
      wrapper.connect(landlord).wrap(w.x, w.y, w.x, w.y, { value: sellPrice - 1n }))
      .to.be.revertedWith("MehERC721: Sending wrong amount of ether")
  })





  /// EXAMPLE FOR WRAPPER UX (see numbered list of transactions)
  for (let w of areas2016) {
    it(`(No-mocks env only). Can wrap blocks (${w.fx}, ${w.fy}, ${w.tx}, ${w.ty})`, async function () {
      ;[landlordAddress, u, s] = await oldMeh.getBlockInfo(w.fx, w.fy);
 
      let landlord = await getImpersonatedSigner(landlordAddress)
      let pricePerBlock = ethers.parseEther("1")
      let blocksCount = countBlocks(w.fx, w.fy, w.tx, w.ty)
      let sellPrice = (pricePerBlock) * (blocksCount)
      await setBalance(landlord.address, sellPrice + (ethers.parseEther("2")));
      
      const landlordBalBefore = await ethers.provider.getBalance(landlord.address)

      // Transactions to wrap a 2016 block:

      // 1. Set block(s) for sale (pricePerBlock - price for each block)
      let sellTx = await oldMeh.connect(landlord).sellBlocks(w.fx, w.fy, w.tx, w.ty, pricePerBlock)
      
      // 2. Wrap (send total sell price in value)
      let wrapTx = await wrapper.connect(landlord).wrap(w.fx, w.fy, w.tx, w.ty, { value: sellPrice })
      // check event is emitted
      await expect(wrapTx)
        .to.emit(wrapper, "Wrapped")
        .withArgs(landlord.address, sellPrice, w.fx, w.fy, w.tx, w.ty);

      // 3. Withdraw money from oldMeh
      let withdrawTx = await oldMeh.connect(landlord).withdrawAll()
      const landlordBalAfter = await ethers.provider.getBalance(landlord.address)

      // gas is calculated approximately. letting 100 wei slip
      let totalGas = await getTotalGas([sellTx, wrapTx, withdrawTx])
      expect(landlordBalBefore - landlordBalAfter - totalGas).to.be.within(-gasCalculationAccuracy, gasCalculationAccuracy)
      expect((await oldMeh.getBlockInfo(w.fx, w.fy)).landlord).to.equal(wrapper.target)
      expect(await wrapper.ownerOf(blockID(w.fx, w.fy))).to.equal(landlord.address)
      // do range
    })
  }

  // WARNING!!! State remains from previuos test
  /// EXAMPLE FOR UNWRAPPER UX (see numbered list of transactions)
  for (let w of areas2016) {
    it(`(No-mocks env only). Can UNwrap blocks (${w.fx}, ${w.fy}, ${w.tx}, ${w.ty})`, async function () {
      let landlordAddress = await wrapper.ownerOf(blockID(w.fx, w.fy));
 
      let landlord = await getImpersonatedSigner(landlordAddress)
      let pricePerBlock = ethers.parseEther("1")
      let blocksCount = countBlocks(w.fx, w.fy, w.tx, w.ty)
      let sellPrice = (pricePerBlock) * (blocksCount)
      await setBalance(landlord.address, sellPrice + (ethers.parseEther("2")));
      
      let sb = await balancesSnapshot(oldMeh, wrapper, referrals)
      const landlordBalBefore = await ethers.provider.getBalance(landlord.address)
      ;[oldMehExBalance, activationTime] = await oldMeh.connect(landlord).getMyInfo()

      // Transactions to unwrap a 2016 block (recaliming ownership on 2016 contract):

      // 1. Unwrap (sending appropriate sell price)
      let unwrapTx = await wrapper.connect(landlord).unwrap(w.fx, w.fy, w.tx, w.ty, pricePerBlock)
      // 2. Sign in to oldMEH (if not yet signed in)
      // await oldMeh.connect(landlord).signIn(mehAdminAddress)
      await expect(unwrapTx)
        .to.emit(wrapper, "Unwrapping")
        .withArgs(landlord.address, pricePerBlock, w.fx, w.fy, w.tx, w.ty);

      // 3. Buy blocks on oldMeh by landlord
      let buyTx = await oldMeh.connect(landlord).buyBlocks(w.fx, w.fy, w.tx, w.ty, { value: sellPrice })
      expect((await oldMeh.getBlockInfo(w.fx, w.fy)).landlord).to.equal(landlord.address)
      let smid = await balancesSnapshot(oldMeh, wrapper, referrals)
      // eth moved from landlord to oldMeh contract
      expect((smid.meh) - (sb.meh)).to.equal(sellPrice)

      // 4. Set new sellprice on oldMeh.
      // WARNING Sell price:
      // - cannot be 0
      // - must be big enough to prevent others from buying it cheap (if the landlord wants to keep the blocks)
      let hugePrice = ethers.parseEther("1000000000")
      let sellTx = await oldMeh.connect(landlord).sellBlocks(w.fx, w.fy, w.tx, w.ty, hugePrice)
      
      // 5. Withdraw money from wrapper
      let withdrawTx = await wrapper.connect(landlord).withdraw(w.fx, w.fy, w.tx, w.ty)
      const landlordBalAfter = await ethers.provider.getBalance(landlord.address)
      let sa = await balancesSnapshot(oldMeh, wrapper, referrals)
      expect((smid.meh) - (sa.meh)).to.equal(sellPrice) // eth moved from oldMeh to wrapper
      await expect(withdrawTx)
        .to.emit(wrapper, "ReceiptWithdrawn")
        .withArgs(landlord.address, sellPrice, w.fx, w.fy, w.tx, w.ty);

      // calculating gas
      let totalGas = await getTotalGas([unwrapTx, buyTx, sellTx, withdrawTx])

      expect(sa.wrapper - (sb.wrapper)).to.equal(0)  // all money is returned
      expect(sa.meh - (sb.meh)).to.equal(0)
      expect(oldMehExBalance + landlordBalBefore - landlordBalAfter - totalGas).to.be.within(-gasCalculationAccuracy, gasCalculationAccuracy)

      // expect(await wrapper.ownerOf(blockID(w.fx, w.fy))).to.equal(ZERO_ADDRESS)
      await expect(wrapper.ownerOf(blockID(w.fx, w.fy))).to.revertedWith(
        "ERC721: invalid token ID")
    })
  }
})


// wrapper must set new sell price to a wrapped block so that nobody can buy it. 
makeSuite("Other", function () {

  it(`(No-mocks env only). Cannot buy wrapped block again`, async function () {
    const w = areas2016[0]  // block to wrap

    ;[landlordAddress, u, s] = await oldMeh.getBlockInfo(w.fx, w.fy);

    let landlord = await getImpersonatedSigner(landlordAddress)
    let pricePerBlock = ethers.parseEther("1")
    await setBalance(landlord.address, pricePerBlock * 3n);
    
    let sellTx = await oldMeh.connect(landlord).sellBlocks(w.fx, w.fy, w.fx, w.fy, pricePerBlock)
    let wrapTx = await wrapper.connect(landlord).wrap(w.fx, w.fy, w.fx, w.fy, { value: pricePerBlock })
    
    // sell price must be set ot a prohibitary value so noine could buy the wrapped block
    // from oldMeh
    let max_uint = ethers.MaxUint256
    expect((await oldMeh.getBlockInfo(w.fx, w.fy)).sellPrice).to.equal(max_uint)
    await expect(oldMeh.connect(landlord).buyBlocks(w.fx, w.fy, w.fx, w.fy, { value: pricePerBlock })).to.be.revertedWithoutReason()

    // wrapper itself cannot buy blocks again
    await expect(wrapper.connect(landlord).wrap(w.fx, w.fy, w.fx, w.fy, { value: pricePerBlock }))
      .to.be.revertedWith("MehERC721: Sending wrong amount of ether")

    expect((await oldMeh.getBlockInfo(w.fx, w.fy)).landlord).to.equal(wrapper.target)
    expect(await wrapper.ownerOf(blockID(w.fx, w.fy))).to.equal(landlord.address)
    // WARNING!!! Next test is using the remaining state
  })

  // WARNING!!! State remains from previuos test
  it(`(No-mocks env only). Funds are sent to landlord, that unwrapped block`, async function () {
    const w = areas2016[0]  // block to wrap
    let landlordAddress = await wrapper.ownerOf(blockID(w.fx, w.fy))
    let landlord = await getImpersonatedSigner(landlordAddress)
    let pricePerBlock = ethers.parseEther("1")
    await setBalance(landlord.address, pricePerBlock * 3n);
    
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

    expect(sb.meh - (sa.meh)).to.equal(pricePerBlock) // withdrawn from meh
    expect(sa.wrapper - (sb.wrapper)).to.equal(0)  // no changes on wrapper 
    expect(landlordBalAfter - (landlordBalBefore)).to.equal(pricePerBlock) // all money are returned to landlord
    expect((jokerBalBefore - (jokerBalAfter))).to.equal(gas) // joker spent gas
    let deletedReceipt = await wrapper.receipts(blockID(w.fx, w.fy))
    expect(deletedReceipt.isAwaitingWithdrawal).to.be.equal(false)
  })
})
  

makeSuite("Multiple recipients", function () {

  // this check needs to be done at wrapping (not unwrapping)
  // because withdrawal checks blocks ownership
  // it will only issue a payment if block does not belong to wrapper
  it("(No-mocks env only). Cannot wrap blocks while a receipt is active", async function () {
    const w = bb16[0]  // getting a landlord which is already signed in
    const cc = availableAreas[0]
    let landlord = await getImpersonatedSigner(w.landlord)
    let price = await wrapper.crowdsalePrice();
    let unwrapPrice = ethers.parseEther("1")
    await setBalance(landlord.address, unwrapPrice * (unwrapPrice * 2n))

    // using same from and too coordinates for this test as those are the same anyway
    // in the constants above. I.e. it is a range of a single block
    await wrapper.connect(landlord)
        .buyBlocks(cc.fx, cc.fy, cc.fx, cc.fy, { value: price })

    // unwrap - buy - wrap 
    let unwrapTxLandlord = await wrapper.connect(landlord).unwrap(cc.fx, cc.fy, cc.fx, cc.fy, unwrapPrice)
    let buyTxLandlord = await oldMeh.connect(landlord).buyBlocks(cc.fx, cc.fy, cc.fx, cc.fy, { value: unwrapPrice })
    // let wrapTxLandlord = await wrapper.connect(landlord).wrap(cc.fx, cc.fy, cc.fx, cc.fy, { value: unwrapPrice })

    await expect(wrapper.connect(landlord).wrap(cc.fx, cc.fy, cc.fx, cc.fy, { value: unwrapPrice }))
      .to.be.revertedWith("MehERC721: Must withdraw receipt first")
  })

  it("(No-mocks env only). Cannot withdraw when multiple recipients within area", async function () {
    const w = bb16[0]  // getting a landlord which is already signed in
    const cc = availableAreas[1]
    let landlord = await getImpersonatedSigner(w.landlord)
    let price = await wrapper.crowdsalePrice();
    let count = countBlocks(cc.fx, cc.fy, cc.tx, cc.ty)
    let total = price * (count)
    let unwrapPrice = ethers.parseEther("1")
    await setBalance(landlord.address, unwrapPrice * (count + 2n))

    // buy range
    await wrapper.connect(landlord)
        .buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: total })
    // transfer 1 block to another account
    let transferTx = await wrapper.connect(landlord).transferFrom(landlord.address, friend.address, blockID(cc.tx, cc.ty))

    // unwrap - buy
    let unwrapTxLandlord = await wrapper.connect(landlord).unwrap(cc.fx, cc.fy, cc.fx, cc.fy, unwrapPrice)
    let buyTxLandlord = await oldMeh.connect(landlord).buyBlocks(cc.fx, cc.fy, cc.fx, cc.fy, { value: unwrapPrice })
    let unwrapTxFriend = await wrapper.connect(friend).unwrap(cc.tx, cc.ty, cc.tx, cc.ty, unwrapPrice)
    let signInTxFriend = await oldMeh.connect(friend).signIn(mehAdminAddress)
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
  it("(No-mocks env only). Can withdraw block receipts one by one", async function () {
    const w = bb16[0]  // getting a landlord which is already signed in
    const cc = availableAreas[1]
    let landlord = await getImpersonatedSigner(w.landlord)

    let price = await wrapper.crowdsalePrice();
    let count = countBlocks(cc.fx, cc.fy, cc.tx, cc.ty)
    let total = price * (count)

    let unwrapPrice = ethers.parseEther("1")
    let totUnwrapPrice = unwrapPrice * (count)

    await setBalance(landlord.address, ethers.parseEther("10"))

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
    expect(landlordBalAfter - (landlordBalBefore)).to.equal(totUnwrapPrice - (totalGas))
  })
})

// similar test is for minter.sol
makeSuite("Minting from oldMeh directly", function () {
  // makes funds rescue possible
  it("funds are separated", async function () {
    const mintingPrice = ethers.parseEther("1")
    const unwrapPrice = mintingPrice * 2n
    const crowdsalePrice = await wrapper.crowdsalePrice();

    // mint and unwrap a block (single) then buy it on meh2016
    const s1 = await balancesSnapshot(oldMeh, wrapper, referrals)
    const mm = availableAreas[1]
    const mintingTx = await wrapper.connect(buyer).buyBlocks(mm.fx, mm.fy, mm.fx, mm.fy, { value: crowdsalePrice })
    const unwrapTx = await wrapper.connect(buyer).unwrap(mm.fx, mm.fy, mm.fx, mm.fy, unwrapPrice)
    const signInTxbuyer = await oldMeh.connect(buyer).signIn(mehAdminAddress)
    await oldMeh.connect(buyer).buyBlocks(mm.fx, mm.fy, mm.fx, mm.fy, { value: unwrapPrice })
    const s2 = await balancesSnapshot(oldMeh, wrapper, referrals)

    // INTERFERE
    // minting at oldMeh directly (creating excess referrals balace)
    // 50% goes to mehAdminAddress, the rest from this sale should go to royalties
    const cc = availableAreas[0]
    const signInTxFriend = await oldMeh.connect(joker).signIn(mehAdminAddress)
    await oldMeh.connect(joker).buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: mintingPrice })
    const s3 = await balancesSnapshot(oldMeh, wrapper, referrals)
    // oldMeh now stores funds from unwrap and minting transaction 
    expect(s3.meh - (s1.meh)).to.equal(unwrapPrice + (mintingPrice))

    // now try to finish unwrap procedure - withdraw funds
    const withdrawTx = await wrapper.connect(buyer).withdraw(mm.fx, mm.fy, mm.fx, mm.fy)
    const s4 = await balancesSnapshot(oldMeh, wrapper, referrals)
    const referralSurplus = mintingPrice / (2n) // 50% is collected from charity
    // unwrap price is withdrawn from meh (not withdrawing from referrals)
    expect(s3.meh - (s4.meh)).to.equal(unwrapPrice)

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
    let total = price * (count)
    let unwrapPrice = ethers.parseEther("1")
    await setBalance(landlord.address, ethers.parseEther("10"))
    // mint 2 blocks
    await wrapper.connect(landlord)
        .buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: total })
    // set both for sale 
    await wrapper.connect(landlord).unwrap(cc.fx, cc.fy, cc.tx, cc.ty, unwrapPrice)
    // reset sell price for second block 
    let newUnwrapPrice = ethers.parseEther("1.22")
    let newTotUnwrapPrice = unwrapPrice + (newUnwrapPrice)
    const resetSellPriceTx = await wrapper.connect(landlord).resetSellPrice(cc.tx, cc.ty, cc.tx, cc.ty, newUnwrapPrice)
    await expect(resetSellPriceTx)
        .to.emit(wrapper, "Unwrapping")
        .withArgs(landlord.address, newUnwrapPrice, cc.tx, cc.ty, cc.tx, cc.ty);
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

    expect(landlordBalAfter - (landlordBalBefore)).to.equal(newTotUnwrapPrice - (totalGas))
  })
})

makeSuite("Metadata", function () {
  it("(No-mocks env only). NFT base URI is available and can be reset by owner", async function () {
    
    // set base uri 
    const defaultBaseURI = "https://img.themillionetherhomepage.com/?tokenid="
    await expect(wrapper.connect(joker).setBaseURI(defaultBaseURI))
      .to.be.revertedWith("Ownable: caller is not the owner")
    // commented the line below because now this URI is set up at deployment
    // await wrapper.connect(owner).setBaseURI(defaultBaseURI)

    // wrap token (tokenURI is only available for minted tokens)
    const w = areas2016[0]
    ;[landlordAddress, u, s] = await oldMeh.getBlockInfo(w.fx, w.fy);
    const landlord = await getImpersonatedSigner(landlordAddress)
    const pricePerBlock = ethers.parseEther("1")
    const blocksCount = countBlocks(w.fx, w.fy, w.tx, w.ty)
    const sellPrice = (pricePerBlock) * (blocksCount)
    await setBalance(landlord.address, sellPrice + (ethers.parseEther("2")));
    const sellTx = await oldMeh.connect(landlord).sellBlocks(w.fx, w.fy, w.tx, w.ty, pricePerBlock)
    const wrapTx = await wrapper.connect(landlord).wrap(w.fx, w.fy, w.tx, w.ty, { value: sellPrice })

    // get tokenURI
    const tokenId = blockID(w.fx, w.fy)
    const tokenURI = await wrapper.connect(joker).tokenURI(tokenId)
    const expectedURI = defaultBaseURI + tokenId
    expect(tokenURI).to.equal(expectedURI)

    // reset new baseURI
    const newBaseURI = "https://img.new.com/?tokenid="
    await wrapper.connect(owner).setBaseURI(newBaseURI)
    const newTokenURI = await wrapper.connect(joker).tokenURI(tokenId)
    const newExpectedURI = newBaseURI + tokenId
    expect(newTokenURI).to.equal(newExpectedURI)

  })
})
