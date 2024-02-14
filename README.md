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
goerli-preview -> mainnet-preview -> main

Keys got same names(almost all of them):
goerli-preview -> mainnet-preview -> mainnet-public

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

# Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.template file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/deploy.js
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```
