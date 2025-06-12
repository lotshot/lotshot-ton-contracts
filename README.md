# Lotshot TON Smart Contracts

This repository contains smart contracts and TypeScript scripts for the Lotshot lottery on the TON blockchain. It includes deployment scripts, unit tests, and metadata examples.

## Prerequisites

- Node.js 20 or later
- npm
- A TON wallet mnemonic for deploying contracts

## Installation

1. Clone the repository.
2. Install dependencies:

   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and provide the required values.

## Environment Variables

The `.env` file requires the following fields:

- `WALLET_MNEMONIC` – seed phrase of the deployment wallet.
- `WALLET_VERSION` – wallet contract version (usually `v4`).
- `TONCENTER_API_KEY` – API key for a TON access provider.
- `COLLECTION_OWNER` – address that will receive NFT royalties.
- `ADMIN_ADDRESS` – address of the lottery administrator.
- `REF_PERCENT` – referral fee in basis points.

## Deploying the NFT Collection

Edit `collectionConfig` in `scripts/deployJet.ts` with the collection owner, royalty percentage and link to your metadata storage. Run the deployment script:

```bash
npm run start
```
Choose `deployCollection`, select the network (`mainnet` or `testnet`), and provide the mnemonic.

## Deploying the Lottery

After the collection is deployed, configure `lotteryConfig` in `scripts/deployJet.ts`. The collection address will be filled automatically. Run:

```bash
npm run start
```
Select `deployJet` and follow the prompts. Ensure you call `deploy()` and `setLotteryAddress()` so the lottery can mint prizes.

## Available Scripts

`deployJet.ts` contains helper functions for interacting with the lottery contract:

- `deploy()` – deploys the lottery contract.
- `setLotteryAddress()` – grants minting rights to the lottery.
- `withdraw()` – transfers accumulated TON from the contract (leaves 0.05 TON).
- `finishRound()` – finalizes the lottery and sends the jackpot NFT.
- `changeAdminAddress()` – updates the lottery administrator.

Function calls are commented out by default. Uncomment the desired call before running `npm run start`.

## Participation

To buy a ticket without a referrer, send the ticket price to the lottery contract with an empty body. If a referrer is involved, include their 267‑bit address in the message body when sending the payment. A portion of the ticket value, defined by `REF_PERCENT`, will automatically be transferred to the referrer.

## Testing

Unit tests are located in the `tests` folder and can be executed with:

```bash
npm test
```

## License

This project is released under the MIT License.
