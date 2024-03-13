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

## Etherscan verify
Verifying mehWrapper.sol

constructor(address meh2016address, address meh2018address, address wethAddress, address soloMarginAddress)

1. Change file etherscan-verify-arguments.js:
```
module.exports = [    
    "0xCedaDc7a2E2291809cB0Cd8A6C092B16CDc7e833",
    "0x2e3b15B8038406008192d8f855bAD3929AD22123",
    "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
    "0xBA12222222228d8Ba445958a75a0704d566BF2C8",
  ];
```

2 Run:
`npx hardhat verify --constructor-args etherscan-verify-arguments.js --network testnet 0x40C82017a737f4aEe6850923ef2E2bc63af72D55`

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