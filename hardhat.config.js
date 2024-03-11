require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');
const conf = require('./conf.js');
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
      //hardhat-verify found one or more errors during the verification process:
      // Etherscan only supports compiler versions 0.4.11 and higher.
      // See https://etherscan.io/solcversions for more information.
      // Seems like there's no need in compiling old meh.
      // {
      //   version: "0.4.2",
      //   // settings: {
      //   //   optimizer: {
      //   //     // enabled: true,
      //   //     // runs: 200
      //   //   }
      //   // }
      // },
    ]
  },
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      chainId: 31337,   // specifying chainId manually, used in getConfigChainID() function from tools
      numConfirmations: 0, // specifying numConfirmations manually, used in tools lib
      url: "http://127.0.0.1:8545",
      // after London gas estimate is wrong
      // increasing accounts balances for tests
      accountsBalance: 1000000000000000000000000n
    },
    hardhat: {
      numConfirmations: 0,
      forking: {
        // url: "https://core.gashawk.io/rpc",
        // url: process.env.TENDERLY_API_KEY !== undefined ? "https://sepolia.gateway.tenderly.co/" + process.env.TENDERLY_API_KEY : "",
        url: process.env.ALCHEMY_MAINNET_URL !== undefined ? process.env.ALCHEMY_MAINNET_URL : "", 
        blockNumber: conf.forkBlock 
      },
      timeout: 12000000,
      // gas: "auto", // this is one of the solutions for after-London forks. 
      // But used another solution. Accept ultra-high gas prices for forked
      // mainnet chain and increase balances
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
  sourcify: {
    // Disabled by default
    // Doesn't need an API key
    enabled: false
  }
};
