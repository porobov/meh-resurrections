const { expect } = require("chai");
const axios = require('axios');
const { ethers } = require("hardhat");
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");
const { setupTestEnvironment } = require("../src/deployer.js")
const { getTotalGas } = require("../src/test-helpers.js")
const { getImpersonatedSigner } = require("../src/tools.js")
const conf = require('../conf.js');

let beneficiaries
let gasCalculationAccuracy = 300
let founder
let partner

function shares(value) {
  const foundersShare = value * (conf.FOUNDER_SHARE_PERCENT) / (100n)
  const partnersShare = value * (conf.PARTNERS_SHARE_PERCENT) / (100n)
  const devsShare = value - foundersShare - partnersShare
  return [foundersShare, partnersShare, devsShare]
}

// function to share deployment sequence between blocks of tests
// Solution from here https://stackoverflow.com/a/26111323
function makeSuite(name, tests) {
  describe(name, function () {
    before('setup', async () => {
      ;[ownerGlobal, stranger, friend, newFounder, newPartner, newDevs] = await ethers.getSigners()
      let env = await setupTestEnvironment({
        isDeployingMinterAdapter: true
      })
      owner = env.owner
      wrapper = env.mehWrapper
      referrals= env.referrals
      oldMeh = env.oldMeh
      beneficiaries = 
          {
            "founder": await wrapper.founder(),
            "partner": await wrapper.partners(),
            "devs": await wrapper.devs(),
          }
      founder = await getImpersonatedSigner(beneficiaries.founder)
      partner = await getImpersonatedSigner(beneficiaries.partner)
      devs = await getImpersonatedSigner(beneficiaries.devs)
      let startinAmount = ethers.parseEther("1.0")
      await setBalance(partner.address, startinAmount)
      await setBalance(founder.address, startinAmount)
      await setBalance(devs.address, startinAmount)

    })
      this.timeout(142000)
      tests();
  });
}

makeSuite("Basic", function () {

  // Founder and partner are hardcoded into contract. 
  // This will check those addresses are paired on-chain. 
  it("Founder and partner are set up correctly (paired on-chain)", async function () {
    async function getTransactions(address) {
      const starFromBlock = 10904896
      const etherscanApi = process.env.ETHERSCAN_API_KEY
      const url = 
      `https://api.etherscan.io/api` +
      `?module=account` +
      `&action=txlist` +
      `&address=${address}` +
      `&startblock=${starFromBlock}` +
      `&endblock=latest` +
      // `&page=1` +
      // `&offset=10` +
      `&sort=asc` +
      `&apikey=${etherscanApi}`
      const { data } = await axios.get(url)
      return data.result
    }

    function searchSender(txs, senderAddr) {
      let isFound = false
      for (let tx of txs) {
        if
        (
          tx.from.toLowerCase() == senderAddr.toLowerCase()
          && tx.value == ethers.parseEther("0.00123")
        ) {
          isFound = true
          console.log(tx)
        }
      }
      return isFound
    }
    
    // Partners send funds to devs, devs send to founder, founder sends to partners
    const founderTxs = await getTransactions(founder.address)
    const partnerTxs = await getTransactions(partner.address)
    const devsTxs = await getTransactions(devs.address)

    const gotFromPartner = searchSender(devsTxs, partner.address)
    const gotFromDevs = searchSender(founderTxs, devs.address)
    const gotFromFounder = searchSender(partnerTxs, founder.address)

    expect(gotFromPartner).to.be.equal(true)
    expect(gotFromDevs).to.be.equal(true)
    expect(gotFromFounder).to.be.equal(true)
  })

  it("Is splitting income correctly", async function () {
    // send funds to wrapper and set royalties through test-adapter
    const value = ethers.parseEther("1.0")
    await wrapper.setRoyalties(value)
    await setBalance(wrapper.target, value)
    // split income through test-adapter
    await wrapper._splitIncomeExt()
    // check
    const [foundersShare, partnersShare, devsShare] = shares(value)
    expect(await wrapper.internalBalOf(beneficiaries.founder)).to.be.equal(foundersShare)
    expect(await wrapper.internalBalOf(beneficiaries.partner)).to.be.equal(partnersShare)
    expect(await wrapper.internalBalOf(beneficiaries.devs)).to.be.equal(devsShare)
    expect(await wrapper.royalties()).to.be.equal(0)
  })

  it("Stranger cannot withdraw income", async function () {
    await expect(wrapper.connect(stranger).withdrawShare()).to.be.revertedWith(
      "Admin: Not an authorized beneficiary"
    )
  })
})

makeSuite("Withdrawals", function () {

  it("Founder and partners can withdraw royalties", async function () {
    // send funds to wrapper and set royalties through test-adapter
    let value = ethers.parseEther("1.0")
    await wrapper.setRoyalties(value)
    await setBalance(wrapper.target, value)

    const [foundersShare, partnersShare, devsShare] = shares(value)

    // founder withdraws
    const founderBalBefore = await ethers.provider.getBalance(beneficiaries.founder)
    const founderTx = await wrapper.connect(founder).withdrawShare()
    const founderBalAfter = await ethers.provider.getBalance(beneficiaries.founder)
    expect(await wrapper.royalties()).to.be.equal(0)
    expect(await wrapper.internalBalOf(beneficiaries.founder)).to.be.equal(0)
    expect(await wrapper.internalBalOf(beneficiaries.partner)).to.be.equal(partnersShare)
    expect(await wrapper.internalBalOf(beneficiaries.devs)).to.be.equal(devsShare)
    const founderReceived = founderBalAfter - founderBalBefore
    expect(foundersShare - founderReceived).to.be.equal(await getTotalGas([founderTx]))

    // partner withdraws (can call withdrawShare with 0 royalties)
    const partnerBalBefore = await ethers.provider.getBalance(beneficiaries.partner)
    const partnerTx = await wrapper.connect(partner).withdrawShare()
    const partnerBalAfter = await ethers.provider.getBalance(beneficiaries.partner)
    expect(await wrapper.royalties()).to.be.equal(0)
    expect(await wrapper.internalBalOf(beneficiaries.founder)).to.be.equal(0)
    expect(await wrapper.internalBalOf(beneficiaries.partner)).to.be.equal(0)
    expect(await wrapper.internalBalOf(beneficiaries.devs)).to.be.equal(devsShare)
    const partnerReceived = partnerBalAfter - partnerBalBefore
    expect(partnersShare - partnerReceived).to.be.equal(await getTotalGas([partnerTx]))

    // devs withdrawals (can call withdrawShare with 0 royalties)
    const devsBalBefore = await ethers.provider.getBalance(beneficiaries.devs)
    const devsTx = await wrapper.connect(devs).withdrawShare()
    const devsBalAfter = await ethers.provider.getBalance(beneficiaries.devs)
    expect(await wrapper.royalties()).to.be.equal(0)
    expect(await wrapper.internalBalOf(beneficiaries.founder)).to.be.equal(0)
    expect(await wrapper.internalBalOf(beneficiaries.partner)).to.be.equal(0)
    expect(await wrapper.internalBalOf(beneficiaries.devs)).to.be.equal(0)
    const devsReceived = devsBalAfter - devsBalBefore
    expect(devsShare - devsReceived).to.be.equal(await getTotalGas([devsTx]))
  })
})

makeSuite("Settings", function () {

  it("Admin (and only admin) can set srowdsale price", async function () {
    let newPrice = ethers.parseEther("1.0")
    await expect(wrapper.connect(stranger).adminSetPrice(newPrice))
      .to.be.revertedWith("Ownable: caller is not the owner")
    await wrapper.connect(owner).adminSetPrice(newPrice)
    expect(await wrapper.crowdsalePrice()).to.be.equal(newPrice)
  })

  it("Founder (and only founder) can set new founder address", async function () {
    let value = ethers.parseEther("1.0")
    await wrapper.setRoyalties(value)
    await setBalance(wrapper.target, value)

    // split income through test-adapter
    await wrapper._splitIncomeExt()

    const [foundersShare, partnersShare, devsShare] = shares(value)
    // set new founder address
    await expect(wrapper.connect(stranger).setFounder(newFounder.address))
      .to.be.revertedWith("Admin: Not founder")
    await wrapper.connect(founder).setFounder(newFounder.address)
    expect(await wrapper.founder()).to.be.equal(newFounder.address)
    expect(await wrapper.internalBalOf(founder.address)).to.be.equal(0)
    expect(await wrapper.internalBalOf(newFounder.address)).to.be.equal(foundersShare)

    // set new partner address
    await expect(wrapper.connect(stranger).setPartners(newPartner.address))
      .to.be.revertedWith("Admin: Not partner")
    await wrapper.connect(partner).setPartners(newPartner.address)
    expect(await wrapper.partners()).to.be.equal(newPartner.address)
    expect(await wrapper.internalBalOf(partner.address)).to.be.equal(0)
    expect(await wrapper.internalBalOf(newPartner.address)).to.be.equal(partnersShare)

    // set new devs address
    await expect(wrapper.connect(stranger).setDevs(newDevs.address))
      .to.be.revertedWith("Admin: Not devs")
    await wrapper.connect(devs).setDevs(newDevs.address)
    expect(await wrapper.devs()).to.be.equal(newDevs.address)
    expect(await wrapper.internalBalOf(devs.address)).to.be.equal(0)
    expect(await wrapper.internalBalOf(newDevs.address)).to.be.equal(devsShare)
  })
})