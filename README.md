# MEH-ressurections

## Node
Use node version 16!
`nvm use v16`

## Deploying 
When releasingWrapper to local testnet, remove addresses in constants and mocks.
```
npx hardhat run scripts/deployMocks.js
npx hardhat run scripts/releaseWrapper.js
```

## Testing
Run tests with empty mocks! Remove test/mocking/[chain_id]_addresses.json
`npx hardhat test test/usingTools.js --network localhost`

## Website key-value storage notes
UX fetches data from Cloudflare key-value storage using a key. 
There are 3 versions of UX, 3 corresponding keys(posted by MEH middleware) and 3 github branches. Here are the branches and the way developement workflow is set.
goerli-preview -> mainnet-preview -> main

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