const { getDeployer } = require('../src/deployer.js');
const { ask } = require('../src/tools.js');

const NEW_OWNER = "0xB1ABEF373F22c123166fB032C6397820d64B761C";
const NEW_FOUNDER = "0xB1ABEF373F22c123166fB032C6397820d64B761C";
const NEW_PARTNERS = "0xB1ABEF373F22c123166fB032C6397820d64B761C";
const NEW_DEVS = "0xB1ABEF373F22c123166fB032C6397820d64B761C";

async function main() {
  try {
    const deployer = await getDeployer();
    await deployer.initialize();

    //check current owner
    const currentOwner = await deployer.mehWrapper.owner();
    console.log("Current owner:", currentOwner);
    // check current founder
    const currentFounder = await deployer.mehWrapper.founder();
    console.log("Current founder:", currentFounder);
    // check current partners
    const currentPartners = await deployer.mehWrapper.partners();
    console.log("Current partners:", currentPartners);
    // check current devs
    const currentDevs = await deployer.mehWrapper.devs();
    console.log("Current devs:", currentDevs);


    // prompt in terminal to confirm
    // Prompt user for confirmation using built-in readline, no external libs
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question(`Are you sure you want to transfer ownership to ${NEW_OWNER}? (y/N): `, (input) => {
        rl.close();
        resolve(input);
      });
    });

    if (answer.trim().toLowerCase() === 'y') {
        const tx = await deployer.mehWrapper.transferOwnership(NEW_OWNER);
        console.log("Sent tx:", tx.hash);
        await tx.wait();
        if (tx.status === 1) {
            console.log("Roles transferred successfully");
        } else {
            console.log("Roles transfer failed");
        }
    }

    // transfer founder
    const tx = await deployer.mehWrapper.setFounder(NEW_FOUNDER);
    console.log("Sent tx:", tx.hash);
    await tx.wait();
    if (tx.status === 1) {
        console.log("Founder transferred successfully");
    } else {
        console.log("Founder transfer failed");
    }

    // transfer partners
    const tx = await deployer.mehWrapper.setPartners(NEW_PARTNERS);
    console.log("Sent tx:", tx.hash);
    await tx.wait();
    if (tx.status === 1) {
        console.log("Partners transferred successfully");
    } else {
        console.log("Partners transfer failed");
    }

    // transfer devs
    const tx = await deployer.mehWrapper.setDevs(NEW_DEVS);
    console.log("Sent tx:", tx.hash);
    await tx.wait();
    if (tx.status === 1) {
        console.log("Devs transferred successfully");
    } else {
        console.log("Devs transfer failed");
    }
    
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

main();