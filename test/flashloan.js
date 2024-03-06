const { expect } = require("chai");
const { ProjectEnvironment } = require("../src/deployer.js")
const { ethers } = require("hardhat");
const { resetHardhatToBlock } = require("../src/tools.js")
const conf = require('../conf.js');

let flashloaner
let mockCoord = 1
let mockBuyer = "0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990"
let wethAddress
let data = '0x03'
let MAX_FEE_PERCENT = 1
const IS_VERBOUSE = conf.IS_VERBOUSE_TEST
  // 

describe("Flashloan", function () {
  
  this.timeout(142000)
  before('setup', async () => {
    ;[ownerGlobal, stranger] = await ethers.getSigners()
    const Flashloaner = await ethers.getContractFactory("FlashloanerAdapter");
    if (conf.IS_DEPLOYING_MOCKS_FOR_TESTS) { 
      const exEnv = new ProjectEnvironment(ownerGlobal)
      const mockAddressesJSON = await exEnv.deployMocks()
      flashloaner = await Flashloaner.deploy(mockAddressesJSON.weth, mockAddressesJSON.soloMargin);
      wethAddress = mockAddressesJSON.weth
    } else {
      // await resetHardhatToBlock(conf.forkBlock)
      flashloaner = await Flashloaner.deploy(conf.wethAddress, conf.soloMarginAddress);
      wethAddress = conf.wethAddress
    }
    await flashloaner.waitForDeployment();
    IS_VERBOUSE ? console.log("Flashloaner:", flashloaner.address) : {}
    IS_VERBOUSE ? console.log("ETH balance of WETH contract:", await ethers.provider.getBalance(wethAddress)) : {}
  })

  // WARNING!!! Hardhat bug. See Receiver.sol for info. 
  // We are only checking here if the transaction reverts or not.
  // borrowExt only borrows money, converts Weth to eth, eth to weth and repays
  // no changes in state whatsoever
  it("Borrows 1, 512 and 16000 WETH", async function () {
    let loanAmount = ethers.parseEther("1")
    await flashloaner.borrowExt(loanAmount, mockBuyer, mockCoord, mockCoord, mockCoord, mockCoord)
    loanAmount = ethers.parseEther("512")
    await flashloaner.borrowExt(loanAmount, mockBuyer, mockCoord, mockCoord, mockCoord, mockCoord)
    loanAmount = ethers.parseEther("16000")
    await flashloaner.borrowExt(loanAmount, mockBuyer, mockCoord, mockCoord, mockCoord, mockCoord)
  })

  // Making sure we are really testing something
  it("Cannot Borrow 1000000 WETH", async function () {
    let loanAmount = ethers.parseEther("1000000")
    await expect(flashloaner.borrowExt(loanAmount, mockBuyer, mockCoord, mockCoord, mockCoord, mockCoord))
      .to.be.revertedWith('BAL#528')
  })

  // hardhat bug. Will work even with Receiver require commented.
  it("Only loan platform can call onFlashLoan function", async function () {
    await expect(flashloaner.connect(stranger).receiveFlashLoan([wethAddress], [1], [0], data))
        .to.be.revertedWith('Flashloaner: Caller is not loanPlatform')
  })

  // The following test does not work due to same hardhat stuuf 
  // 
  // it("Fees cannot be too high", async function () {
  //   // getting impersonated flashloan platform and sending funds to it to cover transaction fees
  //   const impersonatedLoanplatform = await getImpersonatedSigner(conf.soloMarginAddress)
  //   let transactionCost = ethers.parseEther("1")
  //   await setBalance(conf.soloMarginAddress, transactionCost)
  //   await expect(flashloaner.connect(impersonatedLoanplatform).receiveFlashLoan([wethAddress], [1], [0], data))
  //       .to.be.revertedWith('Flashloaner: fees are too high')
  // })
})