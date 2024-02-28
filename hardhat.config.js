require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require('@openzeppelin/hardhat-upgrades');
require("hardhat-gas-reporter");
require("solidity-coverage");
require("@nomicfoundation/hardhat-chai-matchers");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});
// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = { 
  solidity: {
    compilers: [
      {
        version: "0.8.4",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.7.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.5.7",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.4.2",
        // settings: {
        //   optimizer: {
        //     // enabled: true,
        //     // runs: 200
        //   }
        // }
      },
    ]
  },
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      chainId: 31337,   // specifying chainId manually, used in getConfigChainID() function from tools
      numConfirmations: 0, // specifying numConfirmations manually, used in tools lib
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_MAINNET_URL !== undefined ? process.env.ALCHEMY_MAINNET_URL : "", 
        // blockNumber: 13132200 /// 13352488 //  // not paused contract
        // see also conf.js for forkBlock parameter
        blockNumber: 14979315 // fixed recent block number (contracts paused)
      },
      timeout: 12000000,
    },
    // read-only mainnet (for blocks import)
    readMain: {
      chainId: 1,  // specifying chainId manually, used in getConfigChainID() function from tools
      numConfirmations: 0, // specifying numConfirmations manually, used in tools lib
      url: process.env.ALCHEMY_MAINNET_URL !== undefined ? process.env.ALCHEMY_MAINNET_URL : "",
      accounts: {
            mnemonic: "test test test test test test test test test test test junk"
          },
      timeout: 2000000,
    },

    // we gonna use single testname in conf. Rn it is sepolia
    testnet: {
      chainId: 11155111,   // specifying chainId manually, used in getConfigChainID() function from tools
      numConfirmations: 2, // specifying numConfirmations manually, used in tools lib
      url: process.env.ALCHEMY_SEPOLIA_URL !== undefined ? process.env.ALCHEMY_SEPOLIA_URL : "",
      accounts: {
        mnemonic: process.env.MNEMONIC !== undefined ? process.env.MNEMONIC : "",
      },
    }

    // main: {
      // chainId: 1,  // specifying chainId manually, used in getConfigChainID() function from tools
      // numConfirmations: 2, // specifying numConfirmations manually, used in tools lib
    //   url: process.env.ALCHEMY_MAINNET_URL !== undefined ? process.env.ALCHEMY_MAINNET_URL : "",
    //   accounts: {
    //     mnemonic: test test test test test test test test test test test junk
    //   },
    //   timeout: 200000,
    // },

    // tenderly: {
    //   url: "https://rpc.tenderly.co/fork/deleted"
    // }
    // ropsten: {
    //   url: process.env.ROPSTEN_URL || "",
    //   accounts:
    //     process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    // // },

    
      
  },

  gasReporter: {
    enabled: false,  // process.env.REPORT_GAS !== undefined,
    currency: "USD",
    token: "ETH",
    gasPrice: 30,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
