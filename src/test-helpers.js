const { BigNumber } = require('ethers');

function blockID(x, y) {
    return (y - 1) * 100 + x;
  }
  
function countBlocks(fx, fy, tx, ty) {
return (tx - fx + 1) * (ty - fy + 1)
}

function rand1to100() {
  return Math.floor(Math.random() * 99) + 1;
}

async function balancesSnapshot(oldMeh, mehWrapper, referrals) {
  snapshot = {}
  snapshot.meh = await ethers.provider.getBalance(oldMeh.address)
  snapshot.wrapper = await ethers.provider.getBalance(mehWrapper.address)
  snapshot.royalties = await mehWrapper.royalties()
  snapshot.referrals = []
  for (const referral of referrals) {
    let meh = (await oldMeh.getUserInfo(referral.address)).balance
    let wrapper = await ethers.provider.getBalance(referral.address)
    snapshot.referrals.push({meh: meh, wrapper: wrapper})
  }
  return snapshot
}

function txGas(receipt) {
  return receipt.gasUsed.mul(receipt.effectiveGasPrice)
}

async function getTotalGas(txs) {
  let totGas = new BigNumber.from("0")
  for (let tx of txs) {
    totGas = totGas.add(txGas((await tx.wait())))
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