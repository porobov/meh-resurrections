# MEH-ressurections
flash-loans
https://money-legos.studydefi.com/#/dydx?id=flashloans-on-dydx

# Testing 
nvm use v16...


# Website key-value storage notes
UX fetches data from Cloudflare key-value storage using a key. 
There are 3 versions of UX, 3 corresponding keys(posted by MEH middleware) and 3 github branches. Here are the branches and the way developement workflow is set.
goerli-preview -> mainnet-preview -> main

# Advanced Sample Hardhat Project

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