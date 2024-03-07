const { BigNumber } = require('ethers');

function blockID(x, y) {
    return (y - 1) * 100 + x;
  }
  
function countBlocks(fx, fy, tx, ty) {
return BigInt((tx - fx + 1) * (ty - fy + 1))
}

function rand1to100() {
  return Math.floor(Math.random() * 99) + 1;
}

async function balancesSnapshot(oldMeh, mehWrapper, referrals) {
  snapshot = {}
  snapshot.meh = await ethers.provider.getBalance(oldMeh.target)
  snapshot.wrapper = await ethers.provider.getBalance(mehWrapper.target)
  snapshot.royalties = await mehWrapper.royalties()
  snapshot.referrals = []
  for (const referral of referrals) {
    let meh = (await oldMeh.getUserInfo(referral.target)).balance
    let wrapper = await ethers.provider.getBalance(referral.target)
    snapshot.referrals.push({meh: meh, wrapper: wrapper})
  }
  return snapshot
}

function txGas(receipt) {
  return receipt.gasUsed * (receipt.gasPrice)
}

async function getTotalGas(txs) {
  let totGas = 0n
  for (let tx of txs) {
    totGas = totGas + (txGas((await tx.wait())))
  }
  return totGas
}

module.exports = { 
    countBlocks,
    blockID,
    rand1to100,
    balancesSnapshot,
    getTotalGas,
}