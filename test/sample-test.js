const { expect } = require("chai");
const { ethers } = require("hardhat");
const conf = require('../conf.js')

const oldMehAbi = conf.oldMehAbi
const newMehAbi = conf.newMehAbi
const oldMehAddress = conf.oldMehAddress
const newMehAddress = conf.newMehAddress
//https://kndrck.co/posts/local_erc20_bal_mani_w_hh/
describe("Old meh", function () {
  this.timeout(120000);
  // it("Should should return block info", async function () {
  //   signer = (await ethers.getSigners())[0]
  //   // https://etherscan.io/address/0x15dbdB25f870f21eaf9105e68e249E0426DaE916
  //   oldMeh = new ethers.Contract(oldMehAddress, oldMehAbi, signer)
  //   const info = await oldMeh.getBlockInfo(51,43)
    
  //   expect(info.landlord).to.equal('0x9AF5Ba5a5566bA95AFC13E790d80440f407aa1a8');
  // });

  it("Should should return block info", async function () {
    [owner] = await ethers.getSigners();
    
    const MehWrapper = await ethers.getContractFactory("MehWrapper");
    const mehWrapper = await MehWrapper.deploy();
    await mehWrapper.deployed();

    const fund = (await mehWrapper.fund2wei({value: 2})).wait(2)

    // expect(await mehWrapper.loaned()).to.equal(0);

    const setGreetingTx = await mehWrapper.flashLoan(5);

    // // wait until the transaction is mined
    await setGreetingTx.wait(2);

    expect(await mehWrapper.loaned()).to.equal(5);
  
  });
  
});
