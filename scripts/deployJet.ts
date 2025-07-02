import { Address, beginCell, Cell, toNano, contractAddress } from '@ton/core';
import { Jet } from '../wrappers/Jet';
import { JettonMaster } from '../wrappers/JettonMaster';
import { compile, NetworkProvider } from '@ton/blueprint';
import { Collection } from '../wrappers/Collection';
import * as readline from 'readline';

// Collection parameters.
export const collectionConfig = {
    owner: process.env.COLLECTION_OWNER || '', // Collection owner address, receives royalties
    royalty: 10, // Royalty size: 10 means 10%
    content: 'ipfs://bafybeidk355qgbty7amukruuhaptqc5kadxs2m65jtxgabgzexmetdqwsq', // Path to metadata storage, e.g. 'ipfs://bafybeif2afmx74slkwx5iqzvjaa5hmmzwrx7i2po4sds3cv4ojx23kclyu'
};

export async function run(provider: NetworkProvider) {
    const collection = provider.open(Collection.createFromConfig(collectionConfig, await compile('Collection')));

    const lotteryConfig = {
        collectionAddress: collection.address, // Collection address will be inserted automatically
        adminAddress: process.env.ADMIN_ADDRESS || '', // Admin address for the lottery
        price: BigInt(process.env.TICKET_PRICE || '10000000'), // Ticket cost in jettons
        refPercent: Number(process.env.REF_PERCENT || '0'), // Fee in %
        tokenAddress: Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000'),
    };

    const jettonMaster = provider.open(
        JettonMaster.createFromAddress(Address.parse(process.env.TOKEN_ADDRESS || '')),
    );

    const code = await compile('Jet');
    const network = provider.network();
    const jpUsdt = process.env.JACKPOT_AMOUNT_USDT
        ? BigInt(process.env.JACKPOT_AMOUNT_USDT) * 10n ** 9n
        : (network === 'mainnet' ? 10_000n : 100n) * 10n ** 9n;

    // timelock delay (seconds)
    const tlDelay = process.env.TIMELOCK_DELAY_SEC
        ? BigInt(process.env.TIMELOCK_DELAY_SEC)
        : (network === 'mainnet' ? 172800n : 3600n);   // 48h / 1h

    const stateInit = beginCell()
        .storeRef(
            beginCell()
                .storeUint(0, 16)
                .storeUint(0, 16)
                .storeUint(0, 16)
                .storeUint(0, 16)
                .storeUint(0, 16)
                .storeUint(0, 16)
                .storeUint(0, 16)
                .endCell(),
        )
        .storeUint(0, 64)
        .storeAddress(lotteryConfig.collectionAddress)
        .storeAddress(Address.parse(lotteryConfig.adminAddress))
        .storeUint(lotteryConfig.price, 128)
        .storeUint(lotteryConfig.refPercent, 16)
        .storeAddress(lotteryConfig.tokenAddress)
        .storeUint(jpUsdt, 128)   // jp_amount
        .storeUint(0n, 128)       // locked_jp_tokens
        .storeUint(0n, 128)       // token_balance
        .storeUint(0n, 128)       // tl_usdt_amount
        .storeUint(0n, 64)        // tl_usdt_until
        .storeUint(tlDelay, 64)   // tl_delay
        .endCell();

    const init = { code, data: stateInit };
    const jet = provider.open(new Jet(contractAddress(0, init), init));

    // await deploy();
    // await setLotteryAddress();
    // await setTokenWallet();


    // await withdraw();     // Withdraw TON to admin address
    // await withdrawUSDT(); // Withdraw USDT to any address


    // finishRound();



    // This function deploys the lottery contract
    async function deploy() {
        await jet.sendDeploy(provider.sender(), toNano('0.1'));
    }

    // The transaction grants mint permission to the lottery contract
    async function setLotteryAddress() {
        await provider.sender().send({
            to: collection.address,
            value: toNano('0.05'),
           body: beginCell().storeUint(2, 32).storeUint(0, 64).storeAddress(jet.address).endCell(),
        });
    }

    // Writes the lottery jetton wallet address to the contract
    async function setTokenWallet() {
        const wallet = await jettonMaster.getWalletAddress(jet.address);
        console.log('📦 Jetton wallet address for lottery:', wallet.toString());
        console.log('🎯 Jet address (lottery contract):', jet.address.toString());
        console.log('🏦 Jetton master address:', jettonMaster.address.toString());

        await jet.sendSetTokenWalletAddress(provider.sender(), wallet, toNano('0.01'));
        console.log('✅ Token wallet address sent to lottery contract');
    }

    async function withdrawUSDT() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

        const amountStr = await ask('Amount (USDT): ');

        console.log(`Amount: ${amountStr} USDT`);
        const confirm = (await ask('Confirm schedule? (y/N) ')).toLowerCase();
        rl.close();

        if (confirm === 'y' || confirm === 'yes') {
            await jet.sendScheduleUSDT(
                provider.sender(),
                BigInt(amountStr),
                toNano('0.1'),
            );
            console.log('✅ USDT withdrawal scheduled');
        } else {
            console.log('Canceled');
        }
    }

    async function execWithdrawUSDT() {
        await jet.sendExecUSDT(provider.sender(), toNano('0.1'));
        console.log('✅ USDT withdrawal executed');
    }


    // Withdraws funds from the lottery contract. The balance must exceed 0.05 TON
    async function withdraw() {
        await jet.sendWithdraw(provider.sender(), toNano('0.01'));
    }

    // Stops the lottery contract and mints an NFT for the winner
    async function finishRound(winner_address: string) {
        await jet.sendFinishRound(
            provider.sender(),
            Address.parse(winner_address),
            toNano(0.05),
        );
    }

    await provider.waitForDeploy(jet.address);
}
