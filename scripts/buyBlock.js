const { getDeployer } = require('../src/deployer.js');
const cc = {fx: 55, fy: 70, tx: 55, ty: 70}; // singleBlock (reserved for founder)
// (1x45) - vacant area for buying
// const price = ethers.parseEther("0.25");

async function main() {
  try {
    const deployer = await getDeployer();
    await deployer.initialize();
    
    const tx = await deployer.mehWrapper.mintReserved(cc.fx, cc.fy, cc.tx, cc.ty);
    // const tx = await deployer.mehWrapper.buyBlocks(cc.fx, cc.fy, cc.tx, cc.ty, { value: price } );
    console.log("Sent tx:", tx.hash);
    await tx.wait();
    console.log("Block bought successfully");
    
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();
