import { toNano, Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { JettonMaster } from '../wrappers/JettonMaster';
import { JettonWallet } from '../wrappers/JettonWallet';
import * as readline from 'readline';

export async function run(provider: NetworkProvider) {
    const amountStr = await new Promise<string>(res => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question('Amount to top-up (whole USDT): ', ans => { rl.close(); res(ans); });
    });

    const jettons = BigInt(amountStr) * 1_000_000n;

    const tokenMaster = provider.open(
        JettonMaster.createFromAddress(Address.parse(process.env.TOKEN_ADDRESS || '')),
    );
    const adminAddress = provider.sender().address();
    if (!adminAddress) throw new Error('Sender address missing');

    const adminWalletAddr = await tokenMaster.getWalletAddress(adminAddress);
    const lotteryWalletAddr = await tokenMaster.getWalletAddress(
        Address.parse(process.env.LOTTERY_ADDRESS || ''),
    );

    const adminWallet = provider.open(JettonWallet.createFromAddress(adminWalletAddr));
    const balance = await adminWallet.getBalance();
    if (balance < jettons) {
        throw new Error('Insufficient USDT balance');
    }

    await adminWallet.sendTransfer(provider.sender(), {
        to: lotteryWalletAddr,
        amount: jettons,
        value: toNano('0.31'),
        forwardTon: toNano('0.3'),
    });
    console.log(`✅ Topped up ${amountStr} USDT`);
}
