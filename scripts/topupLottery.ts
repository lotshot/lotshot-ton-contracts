import 'dotenv/config';
import { Address, beginCell, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonMaster } from '../wrappers/JettonMaster';
import { JettonWallet } from '../wrappers/JettonWallet';
import * as readline from 'readline';

export async function run(provider: NetworkProvider) {
    const token = process.env.TOKEN_ADDRESS;
    const lottery = process.env.LOTTERY_ADDRESS;
    if (!token || token.length === 0) {
        throw new Error('TOKEN_ADDRESS env variable is missing');
    }
    if (!lottery || lottery.length === 0) {
        throw new Error('LOTTERY_ADDRESS env variable is missing');
    }

    const master = provider.open(
        JettonMaster.createFromAddress(Address.parse(token)),
    );

    const adminTON = provider.sender().address as Address;
    const adminJet = await master.getWalletAddress(adminTON);
    const lotteryJet = await master.getWalletAddress(Address.parse(lottery));

    const adminWallet = provider.open(JettonWallet.createFromAddress(adminJet));

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string) => new Promise<string>(res => rl.question(q, res));
    const amountStr = await ask('USDT amount to send: ');
    rl.close();

    const jettons = BigInt(amountStr) * 1_000_000n;

    await adminWallet.sendTransfer(provider.sender(), {
        value: toNano('0.31'),
        jettonAmount: jettons,
        to: lotteryJet,
        responseAddress: adminTON,
        forwardTonAmount: toNano('0.27'),
        forwardPayload: beginCell().endCell(),
    });

    console.log('✅ Lottery wallet topped up');
}
