# Lotshot Smart Contracts

This repository contains the smart contracts and helper scripts used to run the Lotshot lottery on the TON blockchain. The contracts are written in FunC and can deploy an NFT collection together with a lottery that distributes jetton prizes.

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

## Example Ticket Transfer
```tsx
import { beginCell, Address } from '@ton/core';

const referral = undefined as string | undefined;

const forwardPayloadBuilder = beginCell().storeAddress(userWallet); // player wallet
if (referral) {
  forwardPayloadBuilder.storeAddress(Address.parse(referral));
}
const forwardPayload = forwardPayloadBuilder.endCell();

const payload = beginCell()
  .storeUint(0xf8a7ea5, 32)
  .storeUint(0, 64)
  .storeCoins(BigInt(process.env.TICKET_PRICE!))
  .storeAddress(Address.parse(lotteryWallet))
  .storeAddress(userWallet)
  .storeBit(0)
  .storeCoins(toNano('0.27'))
  .storeRef(forwardPayload)
  .endCell();
```

Send a `transfer` with this payload from your wallet to participate in the lottery.
