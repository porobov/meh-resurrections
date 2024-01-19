const { expect } = require("chai");
const { ethers } = require("hardhat");
const conf = require('../conf.js');

let flashloaner
let mockCoord = 1
let mockBuyer = "0x690B9A9E9aa1C9dB991C7721a92d351Db4FaC990"

describe("Flashloan", function () {
  
  this.timeout(142000)
  before('setup', async () => {
    ;[ownerGlobal, stranger] = await ethers.getSigners()
    const Flashloaner = await ethers.getContractFactory("FlashloanerAdapter");
    flashloaner = await Flashloaner.deploy(conf.wethAddress, conf.soloMarginAddress);
    await flashloaner.deployed();
  })

  it("Borrows 1, 512 and 16000 WETH", async function () {
    let loanAmount = ethers.utils.parseEther("1")
    await flashloaner.borrowExt(loanAmount, mockBuyer, mockCoord, mockCoord, mockCoord, mockCoord)
    loanAmount = ethers.utils.parseEther("512")
    await flashloaner.borrowExt(loanAmount, mockBuyer, mockCoord, mockCoord, mockCoord, mockCoord)
    loanAmount = ethers.utils.parseEther("16000")
    await flashloaner.borrowExt(loanAmount, mockBuyer, mockCoord, mockCoord, mockCoord, mockCoord)
  })

  it("Cannot Borrow 17000 WETH", async function () {
    let loanAmount = ethers.utils.parseEther("17000")
    await expect(flashloaner.borrowExt(loanAmount, mockBuyer, mockCoord, mockCoord, mockCoord, mockCoord))
      .to.be.revertedWith('')
  })

  it("Only loan platform can call onFlashLoan function", async function () {
    let data = '0x03'
    await expect(flashloaner.connect(stranger).receiveFlashLoan(data))
        .to.be.revertedWith('Flashloaner: Caller is not loanPlatform')
  })
})