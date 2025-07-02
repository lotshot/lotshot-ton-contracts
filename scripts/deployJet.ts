import { Address, beginCell, Cell, toNano, contractAddress } from '@ton/core';
import { Jet } from '../wrappers/Jet';
import { compile, NetworkProvider } from '@ton/blueprint';
import { Collection } from '../wrappers/Collection';

// Collection parameters
export const collectionConfig = {
    owner: process.env.COLLECTION_OWNER || '', // wallet that receives royalties
    royalty: 10, // royalty rate: 10% = 10
    content: 'ipfs://bafybeiat3wdd4rzuvlneugpx6tkrvlwor5nupox4dngjhjtifey6rxqcee', // path to metadata storage, e.g. 'ipfs://bafybeif2afmx74slkwx5iqzvjaa5hmmzwrx7i2po4sds3cv4ojx23kclyu'
};

export async function run(provider: NetworkProvider) {
    const collection = provider.open(Collection.createFromConfig(collectionConfig, await compile('Collection')));

    const lotteryConfig = {
        collectionAddress: collection.address, // collection address filled automatically
        adminAddress: process.env.ADMIN_ADDRESS || '', // lottery administrator address
        price: 0.25, // ticket price
        refPercent: Number(process.env.REF_PERCENT || '0'), // referral fee in basis points
    };

    const jetCode = await compile('Jet');
    const network = provider.network();
    const jpAmount = process.env.JACKPOT_AMOUNT_TON
        ? BigInt(process.env.JACKPOT_AMOUNT_TON) * 10n ** 9n   // TON → nanoTON
        : network === 'mainnet'
            ? 1_000n * 10n ** 9n   // 1000 TON
            : 10n    * 10n ** 9n;  // 10 TON for testnet

    // timelock delay for TON withdrawals
    const tlDelayTon = process.env.TIMELOCK_DELAY_SEC_TON
        ? BigInt(process.env.TIMELOCK_DELAY_SEC_TON)
        : (network === 'mainnet' ? 172800n : 3600n);   // 48 h / 1 h

    const jetStateInit = beginCell()
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
        .storeAddress(collection.address)
        .storeAddress(Address.parse(lotteryConfig.adminAddress))
        .storeCoins(toNano(lotteryConfig.price))
        .storeUint(lotteryConfig.refPercent, 16)
        .storeUint(jpAmount, 128)  // jp_amount
        .storeUint(0n, 128)        // locked_jp_coins
        .storeUint(0n, 128)        // tl_ton_amount
        .storeUint(0n, 64)         // tl_ton_until
        .storeUint(tlDelayTon, 64) // tl_delay
        .endCell();

    const jetInit = { code: jetCode, data: jetStateInit };
    const jet = provider.open(new Jet(contractAddress(0, jetInit), jetInit));

    // await deploy();
    // await setLotteryAddress();
    // await withdraw();
    // finishRound();
    // changeAdminAddress();

    // Deploy the lottery contract
    async function deploy() {
        await jet.sendDeploy(provider.sender(), toNano('0.1'));
    }

    // Grant minting rights to the lottery contract
    async function setLotteryAddress() {
        await provider.sender().send({
            to: collection.address,
            value: toNano('0.01'),
            body: beginCell().storeUint(2, 32).storeUint(0, 64).storeAddress(jet.address).endCell(),
        });
    }

    // Withdraw funds from the lottery contract. Balance must exceed 0.05 TON
    async function withdraw() {
        await provider.sender().send({
            to: jet.address,
            value: toNano('0.01'),
            body: beginCell().storeUint(2, 32).storeUint(0, 64).endCell(),
        });
    }

    // Stop the lottery contract and mint an NFT for the winner
    async function finishRound(winner_address: string) {
        await provider.sender().send({
            to: jet.address,
            value: toNano(0.05),
            body: beginCell().storeUint(4, 32).storeUint(0, 64).storeAddress(Address.parse(winner_address)).endCell(),
        });
    }

    // Change the lottery administrator
    async function changeAdminAddress(new_admin: string) {
        await provider.sender().send({
            to: jet.address,
            value: toNano('0.01'),
            body: beginCell()
                .storeUint(3, 32)
                .storeUint(0, 64)
                .storeAddress(Address.parse(new_admin))
                .endCell(),
        });
    }

    await provider.waitForDeploy(jet.address);
}
