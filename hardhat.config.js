require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");
const os = require('os');

const secrets = require(os.homedir() + "/gocrypt/dev/ah-token/Ah-mnemonic.js");
const gateway = require(os.homedir() + "/gocrypt/dev/ah-token/gateway.js");
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
        version: "0.8.4", //0.5.5
      },
      {
        version: "0.5.7",
        settings: {},
      },
    ]
  },
  networks: {
    hardhat: {
      // initialBaseFeePerGas: 0, // workaround from https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136 . Remove when that issue is closed.
      forking: {
        url: gateway.alchemyMainnet,
        blockNumber: 13132200 /// 13352488 //  // not paused contract
      }
    },
    ropsten: {
      url: process.env.ROPSTEN_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    main: {
      url: gateway.alchemyMainnet,
      accounts: {
        mnemonic: secrets.mnemonic
      },
      timeout: 200000,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
