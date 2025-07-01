# Lotshot TON Smart Contracts

This repository contains smart contracts and TypeScript scripts for the Lotshot lottery on the TON blockchain. It includes deployment scripts, unit tests, and metadata examples.

## Project structure

- **contracts** – FunC sources for the lottery and NFT collection.
- **wrappers** – TypeScript wrappers for interacting with contracts.
- **scripts** – deployment and maintenance helpers.
- **tests** – automated tests powered by Jest.

`encodeOffchainContent.ts` contains utilities for preparing NFT metadata.
It converts off-chain links to cell chains so the contracts can store
references on-chain.

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
- `JACKPOT_AMOUNT_TON` – jackpot size in whole TON for the TON lottery  
  (defaults to 1000 TON on mainnet and 10 TON on testnet if unset).

## Compiling contracts

Before running the scripts you may compile the FunC sources to ensure everything is up to date:

```bash
npm run build
```

This step uses `@ton/blueprint` to compile the contracts into binary code that can be deployed.

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

Use `npm run start` to execute the script with [`ts-node`](https://github.com/TypeStrong/ts-node). The prompts will guide you through deployment and management actions.

## Participation

To buy a ticket without a referrer, send the ticket price to the lottery contract with an empty body. If a referrer is involved, include their 267‑bit address in the message body when sending the payment. A portion of the ticket value, defined by `REF_PERCENT`, will automatically be transferred to the referrer.

## Reward Tiers and Metadata

When a ticket is processed the contract calls `randomize_lt()` and then
`rand(12000)` to obtain a number between **0** and **11 999**. The result
determines the reward level, provided that tier still has prizes left:

| Range | Reward | Probability |
|-------|--------|-------------|
| 0 | Jackpot **x1000** | 1&nbsp;/&nbsp;12000 (0.0083%) |
| 1–3 | **x200** | 3&nbsp;/&nbsp;12000 (0.025%) |
| 4–13 | **x77** | 10&nbsp;/&nbsp;12000 (0.083%) |
| 14–63 | **x20** | 50&nbsp;/&nbsp;12000 (0.4167%) |
| 64–213 | **x7** | 150&nbsp;/&nbsp;12000 (1.25%) |
| 214–513 | **x3** | 300&nbsp;/&nbsp;12000 (2.5%) |
| 514–1713 | **x1** | 1200&nbsp;/&nbsp;12000 (10%) |

> **Post-Jackpot behaviour**  
> Once the Jackpot **×1000** tier is claimed, its row is removed,  
> but all other prize tiers remain active and ticket sales continue without pause.  
> Players can verify which rewards are still available by inspecting the NFT attributes  
> `Reward Level` and `Winning Amount` on Getgems.

Metadata describing each tier lives in the `lottery_metadata/` folder.
`collection.json` defines the collection, while `0.json`–`7.json` correspond to
the jackpot, prize tiers and a "Try Again" NFT. To start a new season update the
names, images and links in these files and rebuild the cells using
`encodeOffchainContent.ts`.

## Testing

Unit tests are located in the `tests` folder and can be executed with:

```bash
npm test
```

## License

This project is released under the MIT License.

Contributions are welcome. Feel free to open issues or submit pull requests with improvements.
