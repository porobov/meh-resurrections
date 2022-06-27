const { expect } = require("chai");
const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const conf = require('../conf.js')

const oldMehAbi = conf.oldMehAbi
const newMehAbi = conf.newMehAbi
const oldMehAddress = conf.oldMehAddress
const newMehAddress = conf.newMehAddress
const wethAbi = conf.wethAbi
const wethAddress = conf.wethAddress
const mehAdminAddress = "0xF51f08910eC370DB5977Cff3D01dF4DfB06BfBe1"
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

// gas report
function reportGas(functionName, gasUsed) {
  const gasPrice = process.env.GAS_PRICE_GWEI !== undefined ? process.env.GAS_PRICE_GWEI : 0
  const usd = process.env.ETH_USD_USD !== undefined ? process.env.ETH_USD_USD : 0
  const gasCostsEth = ethers.utils.formatEther(gasUsed.mul(ethers.utils.parseUnits (gasPrice, "gwei")))
  const gasCostsUsd = gasCostsEth * usd
  console.log("Gas used by %s is %s gas | %s Eth | %s USD | (gas price: %s Gwei, ETHUSD: %s)", functionName, gasUsed, gasCostsEth, gasCostsUsd, gasPrice, usd)
}

// open zeppelin's time doesn't work for some reason (maybe me, maybe hardfork)
async function increaseTimeBy(seconds) {
  await network.provider.send("evm_increaseTime", [seconds])
  await network.provider.send("evm_mine") // this one will have 02:00 PM as its timestamp
}

//await ethers.getDefaultProvider().getBalance(address) - will always querry chain data
async function getFormattedBalance(address) {
  return ethers.utils.formatEther(await network.provider.send("eth_getBalance", [address]))
}

async function waitForActivationTime(level) {
  await increaseTimeBy(3600 * (2 ** (level - 1)))
}

async function setUpReferral(referralAddress, level, wrapperAddress) {
    const referralFactory = await ethers.getContractFactory("Referral");
    const referral = await referralFactory.deploy(oldMehAddress, referralAddress);
    const reciept = await referral.deployTransaction.wait();
    const refGasUsed = reciept.gasUsed;
    await referral.deployed();
    await referral.setWrapper(wrapperAddress)
    await waitForActivationTime(level)
    reportGas("Referrals", refGasUsed)
    return referral
}

async function setup() {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [mehAdminAddress],
  });
  const mehAdmin = await ethers.getSigner(mehAdminAddress)
  ;[owner] = await ethers.getSigners()
  const oldMeh = new ethers.Contract(oldMehAddress, oldMehAbi, mehAdmin)

  // unpause oldMEH
  await oldMeh.adminContractSecurity(ZERO_ADDRESS, false, false, false)

  //deploy wrapper
  const MehWrapper = await ethers.getContractFactory("Main");
  const mehWrapper = await MehWrapper.deploy();
  const reciept = await mehWrapper.deployTransaction.wait();
  const mehWrapperGasUsed = reciept.gasUsed;
  await mehWrapper.deployed();
  
  // put more than 2 wei to mehWrapper contract (SoloMargin requirement)
  const weth = new ethers.Contract(wethAddress, wethAbi, owner)
  await weth.deposit({value: 2})
  await weth.transfer(mehWrapper.address, 2)

  // deploy and setup chain of referrals
  const referrals = []
  let currentReferral = mehAdmin
  let newRef
  let referralsGas = BigNumber.from(0)
  for (let level = 1; level <= 7; level++) {
    newRef = await setUpReferral(currentReferral.address, level, mehWrapper.address)
    referrals.push(newRef)
    const receipt = await (await mehWrapper.addRefferal(newRef.address)).wait()
    referralsGas.add(receipt.gasUsed)
    currentReferral = newRef
  }

  // set first referral as charity address
  await oldMeh.adminContractSettings(0, referrals[0].address, 0)

  // wrapper signs in to old meh
  await mehWrapper.signIn(referrals[referrals.length-1].address)


  reportGas("Meh wrapper deployment", mehWrapperGasUsed)

  return {
    oldMeh: oldMeh,
    mehWrapper: mehWrapper,
    referrals: referrals,
    owner: owner
  }
}

describe("Flashloan", function () {

  before('setup', async () => {
    let env = await setup()
    owner = env.owner
    mehWrapper = env.mehWrapper
    referrals= env.referrals
    oldMeh = env.oldMeh
  })

  it("Should should return block info", async function () {
    console.log("owner balance:", await getFormattedBalance(owner.address))
    console.log("meh balance:", await getFormattedBalance(oldMehAddress))
    console.log("charity internal meh balance:", ethers.utils.formatEther((await oldMeh.getUserInfo(referrals[0].address)).balance))
    console.log("charity referral balance:", await getFormattedBalance(referrals[0].address))
    console.log("wrapper balance:", await getFormattedBalance(mehWrapper.address))
    
    // temp. sending eth to the contract
    // await mehWrapper.connect(owner).referralPayback({value: ethers.utils.parseEther("1")});
    // await owner.sendTransaction({
    //   to: mehWrapper.address,
    //   value: ethers.utils.parseEther("1")
    // })

    // buy blocks
    // now wrapper can buy blocks for free 
    // as it collects all the revenue from referrals and charity
    const tx = await mehWrapper.connect(owner).buyFromMEH(82,82,82,82,{value: ethers.utils.parseEther("0.25")});
    const receipt = await tx.wait(1)
    // gas
    const gasCosts = receipt.cumulativeGasUsed.mul(ethers.utils.parseUnits ("30", "gwei"))
    console.log("gas:", receipt.cumulativeGasUsed.toNumber())
    console.log("gas:", ethers.utils.formatEther(gasCosts))
    console.log("usd:", ethers.utils.formatEther(gasCosts)*1200)
    

    console.log("owner balance:", await getFormattedBalance(owner.address))
    console.log("meh balance:", await getFormattedBalance(oldMehAddress))
    console.log("charity internal meh balance:", ethers.utils.formatEther((await oldMeh.getUserInfo(referrals[0].address)).balance))
    console.log("charity referral balance:", await getFormattedBalance(referrals[0].address))
    console.log("wrapper balance:", await getFormattedBalance(mehWrapper.address))
    
    console.log("referrals[0].address", referrals[0].address)
    console.log("charityAddress:", await oldMeh.charityAddress())
    console.log("wrapper:", mehWrapper.address)
    console.log("landlord:", (await oldMeh.getBlockInfo(82,82)).landlord)
    
    for (const referral of referrals) {
      console.log(
        "Referral: %s, meh-bal: %s, bal: %s", 
        referral.address, 
        ethers.utils.formatEther((await oldMeh.getUserInfo(referral.address)).balance),
        await getFormattedBalance(referral.address))
    }

  });
  
});
