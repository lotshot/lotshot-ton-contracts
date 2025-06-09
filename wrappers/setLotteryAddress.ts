// wrappers/setLotteryAddress.ts
import { Address, beginCell, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { Collection } from './Collection';

/**
 * Устанавливает внутренний адрес лотереи в контракт-коллекцию
 * с подробными логами по шагам.
 */
export async function setLotteryAddress(
    collection: Collection,
    jetAddress: Address,
    provider: NetworkProvider
): Promise<void> {
    console.log('➡️ [setLotteryAddress] Начало');
    console.log('   • Исходный jetAddress:', jetAddress.toString());

    const normalized = jetAddress.toString({ bounceable: false, testOnly: false });
    console.log('   • Нормализованный адрес:', normalized);

    const internalJet = Address.parse(normalized);
    console.log('   • Parsed internalJet:', internalJet.toString({ bounceable: false }));

    const body = beginCell()
        .storeUint(2, 32)  // opcode change_lottery_address
        .storeUint(0, 64)  // query_id = 0
        .storeAddress(internalJet)
        .endCell();
    console.log('   • Сформирован body cell');

    const amount = toNano('0.05');
    console.log(`   • Отправка → to=${collection.address.toString()}, value=${amount.toString()} ng`);

    try {
        console.log('   • Отправляем транзакцию...');
        await provider.sender().send({
            to: collection.address,
            value: amount,
            body,
        });
        console.log('✅ [setLotteryAddress] успешно отправлено');
    } catch (error) {
        console.error('❌ [setLotteryAddress] ошибка при отправке:', error);
        throw error;
    }
}
