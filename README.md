# MEH-ressurections

## Node
Using node version 18.
`nvm use v16`

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