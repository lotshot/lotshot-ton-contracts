import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { Jet } from '../wrappers/Jet';
import readline from 'readline';

export async function run(provider: NetworkProvider) {
    const jet = provider.open(
        Jet.createFromAddress(Address.parse(process.env.JET_ADDRESS!)),
    );

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

    const jetLink = `https://testnet.tonviewer.com/${jet.address.toString({
        bounceable: true,
        testOnly: true,
    })}`;

    const amountStr = await ask(`Deposit amount (TON) for ${jetLink}: `);
    console.log(`Deposit ${amountStr} TON to ${jetLink}`);
    const confirm = (await ask('Confirm deposit? (y/N) ')).toLowerCase();
    rl.close();
    if (confirm !== 'y' && confirm !== 'yes') {
        console.log('Canceled');
        return;
    }

    await jet.sendAdminDeposit(provider.sender(), toNano(amountStr));

    console.log(`✅ deposited ${amountStr} TON`);
}
