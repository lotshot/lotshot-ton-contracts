import { Address, beginCell, Cell, toNano } from '@ton/core';
import { Jet } from '../wrappers/Jet';
import { compile, NetworkProvider } from '@ton/blueprint';
import { Collection } from '../wrappers/Collection';

// Данные для коллекции.
export const collectionConfig = {
    owner: process.env.COLLECTION_OWNER || '', // Адрес владельца коллекции, получателя роялти
    royalty: 10, // Размер роялти: для 10% = 10 (20 для Тестнета)
    content: 'ipfs://bafybeiejvmv4eduvtomgsxcg2nqmoob6423nwt2krmuc6xk6seyjev3hvu', // Указываем путь до хранилища метаданных пример: 'ipfs://bafybeif2afmx74slkwx5iqzvjaa5hmmzwrx7i2po4sds3cv4ojx23kclyu'
};

export async function run(provider: NetworkProvider) {
    const collection = provider.open(Collection.createFromConfig(collectionConfig, await compile('Collection')));

    const lotteryConfig = {
        collectionAddress: collection.address, // Адрес коллекции будет взят автоматически
        adminAddress: process.env.ADMIN_ADDRESS || '', // Адрес админа для лотереи
        price: 0.25, //Цена билета
        refPercent: Number(process.env.REF_PERCENT || '0'), // комиссия в базисных пунктах
    };

    const jet = provider.open(Jet.createFromConfig(lotteryConfig, await compile('Jet')));

    // await deploy();
    // await setLotteryAddress();
    await withdraw();
    // finishRound();
    // changeAdminAddress();

    // функция создает контракт с лотереей
    async function deploy() {
        await jet.sendDeploy(provider.sender(), toNano('0.1'));
    }

    // Транзакция выдаст право минта для лотерейного контракта
    async function setLotteryAddress() {
        await provider.sender().send({
            to: collection.address,
            value: toNano('0.01'),
            body: beginCell().storeUint(2, 32).storeUint(0, 64).storeAddress(jet.address).endCell(),
        });
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

    // Изменит адрес администратора лотереи
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
