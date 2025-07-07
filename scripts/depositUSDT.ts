import { Address, beginCell, toNano } from '@ton/core';
import { Jet } from '../wrappers/Jet';
import { JettonMaster } from '../wrappers/JettonMaster';
import { NetworkProvider } from '@ton/blueprint';
import { OP_ADMIN_DEPOSIT } from '../wrappers/opcodes';

export async function run(provider: NetworkProvider) {
    const jetAddress = Address.parse(process.env.LOTTERY_ADDRESS || '');
    const tokenAddress = Address.parse(process.env.TOKEN_ADDRESS || '');
    const adminAddress = Address.parse(process.env.ADMIN_ADDRESS || '');

    const jet = provider.open(Jet.createFromAddress(jetAddress));
    const master = provider.open(JettonMaster.createFromAddress(tokenAddress));

    const adminWallet = await master.getWalletAddress(adminAddress);
    const lotteryWallet = await master.getWalletAddress(jet.address);

    const amountTokens = BigInt(process.env.DEPOSIT_USDT || '0');
    const payload = beginCell().storeUint(OP_ADMIN_DEPOSIT, 32).endCell();

    const body = beginCell()
        .storeUint(0x0f8a7ea5, 32) // jetton transfer
        .storeUint(0, 64)
        .storeCoins(amountTokens * 1000000n)
        .storeAddress(lotteryWallet)
        .storeAddress(adminAddress)
        .storeUint(0, 1)
        .storeCoins(toNano('0.27'))
        .storeUint(1, 1)
        .storeRef(payload)
        .endCell();

    await provider.sender().send({
        to: adminWallet,
        value: toNano('0.5'),
        body,
    });

    console.log('✅ Deposit sent');
}
