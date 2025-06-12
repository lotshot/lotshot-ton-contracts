# Lotshot Smart Contracts

Lotshot is a decentralized lottery running entirely on the TON blockchain. The smart contracts are written in FunC and managed through a TypeScript tooling stack. Together they deploy an NFT collection and handle a lottery where prizes are paid out in jettons.

The lottery accepts jetton payments for tickets. A random number determines which prize tier is won, and counters limit how many prizes of each level can be issued per round. When the jackpot tier is hit, no new tickets are accepted until the round is finished.

## Setup
1. Run `npm install` to install the project dependencies.
2. Copy `.env.example` to `.env` and edit the variables:
   - `COLLECTION_OWNER` – address that owns the NFT collection.
   - `ADMIN_ADDRESS` – wallet that manages the lottery.
   - `TOKEN_ADDRESS` – jetton used to pay for lottery tickets.
   - `TICKET_PRICE` – price of one ticket denominated in the jetton.
   - `REF_PERCENT` – referral payout in basis points.

## Deployment
1. Prepare the metadata files `collection.json` and `0.json–7.json`, upload them to IPFS and place the resulting link into `collectionConfig.content`.
2. Run `npm run start` and choose `deployCollection` to deploy the NFT collection contract.
3. Adjust `lotteryConfig` in `scripts/deployJet.ts` and select `deployJet` to deploy the lottery contract.
4. From the same script run `setLotteryAddress()` so the lottery contract can mint NFTs.

The `deployJet.ts` script also exposes `withdraw()`, `withdrawUSDT()` and `finishRound(winner)` for administrative actions.

## NFT Collection
The lottery issues unique NFTs for every prize tier. Metadata for each token can be found in the `lottery_metadata` directory and is pinned to IPFS. The collection is deployed once and the lottery contract mints the appropriate token when a player wins.

## Participation
Send a jetton `transfer` to the lottery wallet with the amount equal to `TICKET_PRICE`. If you have a referrer, include the 267‑bit address inside the payload. Any overpayment is returned and the referral share is sent to the referrer.

## Lottery Mechanics
1. After receiving a payment, the contract generates a random number `x` from 0 to 1199.
2. If `x == 0` the contract informs the administrator about a potential jackpot. The admin should call `finishRound(address)`:
   - the player receives `JACKPOT_PRIZE` (10 000 jettons) and NFT `0`;
   - the jackpot counter increases and no new tickets are accepted.
3. Otherwise `x` is checked against the ranges below. A prize is issued while the associated counter is below its limit. The table assumes a round of 1 200 tickets (ten times smaller than the reference table for 12 000: `1, 3, 10, 50, 150, 300, 1190`).

   | Range of `x` | Counter limit | Prize (jettons) | NFT |
   |--------------|--------------:|---------------:|----:|
   | `x == 0`     | `jp < 1`      | 10 000          | 0 |
   | `x < 2`      | `major < 1`   | 1 800           | 1 |
   | `x < 3`      | `high < 1`    | 700             | 2 |
   | `x < 8`      | `mid < 5`     | 180             | 3 |
   | `x < 23`     | `low_mid < 15`| 50              | 4 |
   | `x < 53`     | `low < 30`    | 25              | 5 |
   | `x < 172`    | `mini < 119`  | 10              | 6 |
   | otherwise    | —             | 0               | 7 |
4. After the prize is issued, one of the counters `jp`, `major`, `high`, `mid`, `low_mid`, `low`, `mini` is increased. The NFT is minted from the collection and the jetton prize is sent to the player.
5. The contract must always keep at least 0.05 TON and enough jettons for future payouts.
6. When sending a ticket, store your TON wallet address first in `forward_payload`, followed by an optional referrer address. Set `forward_ton_amount` to at least `0.27` TON.

## Technology Stack
- **FunC** for smart contracts
- **TypeScript** scripts and tests
- **@ton/blueprint** and **ton-sandbox** for local development
- **Jetton** token standard for ticket payments

## TON Blockchain
Lotshot leverages the speed and low fees of The Open Network. Transactions are transparent and immutable, and NFTs are issued directly on-chain.

## License
This project is released under the MIT License. See the [LICENSE](LICENSE) file for details.

