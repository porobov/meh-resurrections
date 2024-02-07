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
UX fetches data from Cloudflare key-value storage using a key. There are 3 versions of UX, 3 corresponding keys(posted by MEH middleware) and 3 corresponding github branches.

Here are the branches and the way developement workflow is set.
goerli-preview -> mainnet-preview -> main

Keys got same names.

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