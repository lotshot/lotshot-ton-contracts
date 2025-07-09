// deposit-usdt.ts
import { Address, beginCell, toNano } from '@ton/core';
import { NetworkProvider }            from '@ton/blueprint';
import { Jet }                        from '../wrappers/Jet';
import { JettonMaster }               from '../wrappers/JettonMaster';
import { OP_ADMIN_DEPOSIT }           from '../wrappers/opcodes';
import readline                       from 'readline';

export async function run(provider: NetworkProvider) {
    /* ── contracts & addresses ───────────────────────────────────────── */
    const jet       = provider.open(
        Jet.createFromAddress(Address.parse(process.env.LOTTERY_ADDRESS!))
    );
    const master    = provider.open(
        JettonMaster.createFromAddress(Address.parse(process.env.TOKEN_ADDRESS!))
    );
    const adminEOA  = Address.parse(process.env.ADMIN_ADDRESS!);

    const adminWallet = await master.getWalletAddress(adminEOA);   // admin jetton-wallet
    const jetWallet   = await master.getWalletAddress(jet.address); // game jetton-wallet (only for info)
    const jetAddr     = jet.address;                                // Jet contract itself

    /* ── ask for amount ─────────────────────────────────────────────── */
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

    //const jetLink = `https://tonviewer.com/${jet.address.toString()}`;
    const jetLink = `https://testnet.tonviewer.com/${jet.address.toString({
        bounceable: true,
        testOnly:   true,       // adds “-test-only” flag so TonViewer opens the test-net page
    })}`;
    const amountStr = await ask(`Deposit amount (USDT) for ${jetLink}: `);
    console.log(`Deposit ${amountStr} USDT to ${jetLink}`);
    const confirm = (await ask('Confirm deposit? (y/N) ')).toLowerCase();
    rl.close();
    if (confirm !== 'y' && confirm !== 'yes') {
        console.log('Canceled');
        return;
    }

    const micro = BigInt(amountStr) * 1_000_000n;   // 6-decimals → micro-USDT

    /* ── forward_payload with OP_ADMIN_DEPOSIT (0x4445_504F, "DEPO") ── */
    const fwdPayload = beginCell()
        .storeUint(OP_ADMIN_DEPOSIT, 32)
        .endCell();

    /* ── build jetton_transfer body ──────────────────────────────────── */
    const body = beginCell()
        .storeUint(0x0f8a7ea5, 32)     // op::jetton_transfer (TEP-74)
        .storeUint(0, 64)              // query_id
        .storeCoins(micro)             // amount (µUSDT)
        .storeAddress(jetAddr)         // **dest = Jet contract (NOT its wallet)**
        .storeAddress(adminEOA)        // response_destination (any address)
        .storeUint(0, 1)               // no custom_payload
        .storeCoins(toNano('0.39'))    // forward TON for Jet contract gas
        .storeUint(1, 1)               // forward_payload is stored in **ref**
        .storeRef(fwdPayload)          // ref with 32-bit 'DEPO'
        .endCell();

    /* ── send from the admin’s wallet ───────────────────────────────── */
    await provider.sender().send({
        to:    adminWallet,            // admin jetton-wallet
        value: toNano('0.5'),          // enough TON for both tx and forwarding
        body,
    });

    console.log(`✅ deposited ${amountStr} USDT`);
}
