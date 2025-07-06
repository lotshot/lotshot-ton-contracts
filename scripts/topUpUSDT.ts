import { toNano, Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { Jet } from '../wrappers/Jet';
import * as readline from 'readline';

export async function run(provider: NetworkProvider) {
    const amountStr = await new Promise<string>(res => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question('Amount to top-up (whole USDT): ', ans => { rl.close(); res(ans); });
    });

    const jettons = BigInt(amountStr) * 1_000_000n;
    const jet = provider.open(
        Jet.createFromAddress(Address.parse(process.env.LOTTERY_ADDRESS || '')),
    );

    await jet.sendTopUpUSDT(provider.sender(), jettons, toNano('0.06'));
    console.log(`✅ Topped up ${amountStr} USDT`);
}
