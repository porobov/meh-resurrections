const { getDeployer } = require('../src/deployer.js');
const { ask } = require('../src/tools.js');

const NEW_OWNER = "0xB1ABEF373F22c123166fB032C6397820d64B761C";
const NEW_FOUNDER = "0xB1ABEF373F22c123166fB032C6397820d64B761C";
const NEW_PARTNERS = "0xB1ABEF373F22c123166fB032C6397820d64B761C";
const NEW_DEVS = "0xB1ABEF373F22c123166fB032C6397820d64B761C";

// Role transfer configuration
const ROLES_CONFIG = {
  owner: {
    currentGetter: 'owner',
    transferFunction: 'transferOwnership',
    newAddress: NEW_OWNER,
    description: 'ownership'
  },
  founder: {
    currentGetter: 'founder',
    transferFunction: 'setFounder',
    newAddress: NEW_FOUNDER,
    description: 'founder'
  },
  partners: {
    currentGetter: 'partners',
    transferFunction: 'setPartners',
    newAddress: NEW_PARTNERS,
    description: 'partners'
  },
  devs: {
    currentGetter: 'devs',
    transferFunction: 'setDevs',
    newAddress: NEW_DEVS,
    description: 'devs'
  }
};

async function transferRole(deployer, roleName, roleConfig) {
  try {
    // Get current role holder
    const currentHolder = await deployer.mehWrapper[roleConfig.currentGetter]();
    console.log(`Current ${roleConfig.description}:`, currentHolder);
    
    // Check if transfer is needed
    if (currentHolder.toLowerCase() === roleConfig.newAddress.toLowerCase()) {
      console.log(`${roleConfig.description} is already set to ${roleConfig.newAddress}`);
      return { success: true, skipped: true };
    }

    // Prompt for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question(`Are you sure you want to transfer ${roleConfig.description} from ${currentHolder} to ${roleConfig.newAddress}? (y/N): `, (input) => {
        rl.close();
        resolve(input);
      });
    });

    if (answer.trim().toLowerCase() === 'y') {
      console.log(`Transferring ${roleConfig.description}...`);
      const tx = await deployer.mehWrapper[roleConfig.transferFunction](roleConfig.newAddress);
      console.log(`Sent tx for ${roleConfig.description}:`, tx.hash);
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log(`${roleConfig.description} transferred successfully`);
        return { success: true, skipped: false };
      } else {
        console.log(`${roleConfig.description} transfer failed`);
        return { success: false, skipped: false };
      }
    } else {
      console.log(`${roleConfig.description} transfer skipped`);
      return { success: true, skipped: true };
    }
  } catch (error) {
    console.error(`Error transferring ${roleConfig.description}:`, error.message || error);
    return { success: false, skipped: false, error };
  }
}

async function transferAllRoles() {
  try {
    const deployer = await getDeployer();
    await deployer.initialize();

    console.log("=== Role Transfer Script ===");
    console.log("Current role holders:");
    
    // Display current role holders
    for (const [roleName, roleConfig] of Object.entries(ROLES_CONFIG)) {
      const currentHolder = await deployer.mehWrapper[roleConfig.currentGetter]();
      console.log(`${roleConfig.description}: ${currentHolder}`);
    }
    
    console.log("\n=== Transfer Configuration ===");
    for (const [roleName, roleConfig] of Object.entries(ROLES_CONFIG)) {
      console.log(`${roleConfig.description}: ${roleConfig.newAddress}`);
    }

    console.log("\n=== Starting Role Transfers ===");
    
    const results = {};
    
    // Transfer each role
    for (const [roleName, roleConfig] of Object.entries(ROLES_CONFIG)) {
      console.log(`\n--- Processing ${roleConfig.description} ---`);
      results[roleName] = await transferRole(deployer, roleName, roleConfig);
    }

    // Summary
    console.log("\n=== Transfer Summary ===");
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const [roleName, result] of Object.entries(results)) {
      const roleConfig = ROLES_CONFIG[roleName];
      if (result.success) {
        if (result.skipped) {
          console.log(`✅ ${roleConfig.description}: Skipped (already set)`);
          skippedCount++;
        } else {
          console.log(`✅ ${roleConfig.description}: Transferred successfully`);
          successCount++;
        }
      } else {
        console.log(`❌ ${roleConfig.description}: Failed`);
        failedCount++;
      }
    }

    console.log(`\nSummary: ${successCount} transferred, ${skippedCount} skipped, ${failedCount} failed`);

  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  }
}

// Run the script
transferAllRoles();