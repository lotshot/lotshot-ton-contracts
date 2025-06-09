import { Address, beginCell, Cell, toNano } from '@ton/core';
import { Jet } from '../wrappers/Jet';
import { JettonMaster } from '../wrappers/JettonMaster';
import { compile, NetworkProvider } from '@ton/blueprint';
import { Collection } from '../wrappers/Collection';

// Данные для коллекции.
export const collectionConfig = {
    owner: process.env.COLLECTION_OWNER || '', // Адрес владельца коллекции, получателя роялти
    royalty: 10, // Размер роялти: для 10% = 10
    content: 'ipfs://bafybeidk355qgbty7amukruuhaptqc5kadxs2m65jtxgabgzexmetdqwsq', // Указываем путь до хранилища метаданных пример: 'ipfs://bafybeif2afmx74slkwx5iqzvjaa5hmmzwrx7i2po4sds3cv4ojx23kclyu'
};

export async function run(provider: NetworkProvider) {
    const collection = provider.open(Collection.createFromConfig(collectionConfig, await compile('Collection')));

    const lotteryConfig = {
        collectionAddress: collection.address, // Адрес коллекции будет взят автоматически
        adminAddress: process.env.ADMIN_ADDRESS || '', // Адрес админа для лотереи
        price: BigInt(process.env.TICKET_PRICE || '10000000'), // цена билета в jetton
        refPercent: Number(process.env.REF_PERCENT || '0'), // комиссия в базисных пунктах
        tokenAddress: Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000'),
    };

    const jettonMaster = provider.open(
        JettonMaster.createFromAddress(Address.parse(process.env.TOKEN_ADDRESS || '')),
    );

    const jet = provider.open(Jet.createFromConfig(lotteryConfig, await compile('Jet')));

    // await deploy();
     await setLotteryAddress();
    // await setTokenWallet();
    // withdraw();
    // finishRound();
    // await setLotteryAddressManual();

    // функция создает контракт с лотереей
    async function deploy() {
        await jet.sendDeploy(provider.sender(), toNano('0.1'));
    }

    // Транзакция выдаст право минта для лотерейного контракта
    async function setLotteryAddress() {
        await provider.sender().send({
            to: collection.address,
            value: toNano('0.05'),
           body: beginCell().storeUint(2, 32).storeUint(0, 64).storeAddress(jet.address).endCell(),
        });
    }

    // Запишет адрес jetton-кошелька лотереи в контракт
    async function setTokenWallet() {
        const wallet = await jettonMaster.getWalletAddress(jet.address);
        console.log('📦 Jetton wallet address for lottery:', wallet.toString());
        console.log('🎯 Jet address (lottery contract):', jet.address.toString());
        console.log('🏦 Jetton master address:', jettonMaster.address.toString());

        await jet.sendSetTokenWalletAddress(provider.sender(), wallet, toNano('0.01'));
        console.log('✅ Token wallet address sent to lottery contract');
    }


    // Выведет деньги с контракта лотереи. Баланс лотереи должен быть больше 0.05 TON
    async function withdraw() {
        await provider.sender().send({
            to: jet.address,
            value: toNano('0.01'),
            body: beginCell().storeUint(2, 32).storeUint(0, 64).endCell(),
        });
    }

    // Остановит работу лотерейного контракта. Также будет создан нфт для победителя
    async function finishRound(winner_address: string) {
        await provider.sender().send({
            to: jet.address,
            value: toNano(0.05),
            body: beginCell().storeUint(4, 32).storeUint(0, 64).storeAddress(Address.parse(winner_address)).endCell(),
        });
    }

    await provider.waitForDeploy(jet.address);
}
