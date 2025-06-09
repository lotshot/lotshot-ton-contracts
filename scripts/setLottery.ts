// scripts/setLottery.ts
import { compile, NetworkProvider } from '@ton/blueprint';
import { Address, beginCell, toNano } from '@ton/core';
import { Collection } from '../wrappers/Collection';
import { collectionConfig } from './deployJet';  // <-- Импорт вашего export const collectionConfig

export async function run(provider: NetworkProvider) {
    console.log('➡️ [setLottery] Старт');

    // 1) Компиляция ABI контракта Collection
    console.log('   • Компиляция Collection...');
    const colCode = await compile('Collection');

    // 2) Открываем экземпляр коллекции
    console.log('   • Открытие Collection @', collectionConfig);
    const collection = provider.open(
        Collection.createFromConfig(collectionConfig, colCode)
    );

    // 3) Читаем JET_ADDRESS из .env
    const raw = process.env.JET_ADDRESS;
    if (!raw) throw new Error('❌ Нужно задать JET_ADDRESS в .env (формат 0:...)');
    const jetRaw = Address.parse(raw);
    console.log('   • Исходный jetAddress:', jetRaw.toString());

    // 4) Нормализуем — убираем bounceable/testOnly-флаги
    const normalized = jetRaw.toString({ bounceable: false, testOnly: false });
    console.log('   • Нормализованный адрес:', normalized);
    const internalJet = Address.parse(normalized);

    // 5) Формируем body для op=2
    const body = beginCell()
        .storeUint(2, 32)  // change_lottery_address
        .storeUint(0, 64)  // query_id = 0
        .storeAddress(internalJet)
        .endCell();
    console.log('   • Body сформирован');

    // 6) Отправляем транзакцию на 0.05 TON
    const amount = toNano('0.05');
    console.log(
        `   • Отправляем → to=${collection.address.toString()}, value=${amount.toString()}ng`
    );
    await provider.sender().send({
        to: collection.address,
        value: amount,
        body,
    });

    console.log('✅ [setLottery] Адрес лотереи в коллекции обновлён успешно');
}
