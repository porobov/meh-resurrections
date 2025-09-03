# MEH-ressurections

## Deploying 
When releasing Wrapper to local testnet, remove addresses in constants and mocks (if present):
test/mocking/31337_addresses.json
constants/31337_constants.json

Then run:
```
npx hardhat node
```
And in another terminal:
```
npx hardhat run scripts/deployMocks.js
npx hardhat run scripts/releaseWrapper.js
```

## Testing
Run tests with empty mocks! Remove test/mocking/[chain_id]_addresses.json
`npx hardhat test test/usingTools.js --network localhost`

To test using forked mainnet:
`npx hardhat test  --network hardhat`

## Website key-value storage notes
UX fetches data from Cloudflare key-value storage using a key. There are 3 versions of UX, 3 corresponding keys(posted by MEH middleware) and 3 corresponding github branches. When using React or Next, this is not gonna be needed (will move MY_KEY constant to .env)

Here are the branches and the way developement workflow is set:
goerli-preview (testnet-preview) -> mainnet-preview -> main

Keys got same names(almost all of them):
testnet-preview -> mainnet-preview -> mainnet-public

## Fields of the JSON retrieved from KV storage
adsSnapshot - everything needed to construct main site view (ads and links)
    latestEventId - latest PlaceImage (not exact name) event ID emitted by MEH smart contract
    latestDownloadTimestamp - last time images were downloaded by middleware (internal stuff, added for debugging here)
    picMapJSON[NFT_token_id] - links data
    bigPicBinary - constructed 1000x1000 px image with all ads 

buySellSnapshot
    latestEventId - latest BuyArea (not exact name) event ID emitted by MEH smart contract 
    picMapJSON[NFT_token_id] - ownership data 
    bigPicBinar - constructed 1000x1000 px ownership map

newImageLatestCheckedBlock - latest block where PlaceImage (not exact name) event was checked
buySellLatestCheckedBlock - latest block where BuyArea (not exact name) event was checked
mehContractAddress - original MEH contract address
chainID - chain ID
envType - "preview" or "public" as descibed above
middleWareID - id of a server where middleware runs at
timestamp - timestamp when the JSON was published to KV storage

## Website developement
Use cloudflare wrangler:
`wrangler pages dev /website`

...or run webpage locally with node:
`node server/server.js`

...or use nodemon:
`nodemon server/server.js`

## Etherscan verify Referals
1. Verify ReferalFactory:
npx hardhat verify --network <network_name> <factory_contract_address_from_console_output> <oldMehAddr_from_constants> <mehAdmin_address_from_console_output>
2. Verify Referal implementation (in OpenZeppelin terms):
npx hardhat verify --network <network_name> <implementation_address_from_etherscan> 
(Proxy Contract Verification -> Verify -> Copy Address)

## Etherscan verify wrapper
Verifying mehWrapper.sol

constructor(address meh2016address, address meh2018address, address wethAddress, address soloMarginAddress)

1. Change file etherscan-verify-arguments.js:
```
module.exports = [    
    "0x15dbdB25f870f21eaf9105e68e249E0426DaE916",
    "0xCEf41878Db032586C835eE0890484399402A64f6",
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
  ];
```

2 Run:
`npx hardhat verify --constructor-args etherscan-verify-arguments.js --network readMain 0xb287dB1734b1BE9Fd681658d7dC3f2169bE9e45c`

## Hardhat commands

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.js
node scripts/deploy.js
npx eslint '**/*.js'
npx eslint '**/*.js' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```