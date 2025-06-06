import { Address, beginCell, Cell, internal } from '@ton/core';
import { compile } from '@ton/blueprint';
import { SmartContract } from 'ton-contract-executor';
import { jetConfigToCell } from '../wrappers/Jet';

const ticketPrice = 10n * 1_000_000n;
const playerFee = 270000000n;

function buildJettonTransfer(amount: bigint, wallet: Address, payload: Cell) {
    return beginCell()
        .storeUint(0x7362d09c, 32)
        .storeUint(0, 64)
        .storeCoins(amount)
        .storeAddress(wallet)
        .storeUint(1, 1)
        .storeRef(payload)
        .endCell();
}

async function createContract(options?: { counters?: number[]; rand?: number }) {
    const code = await compile('Jet');
    const counters = options?.counters ?? [0, 0, 0, 0, 0, 0, 0];
    const countersCell = beginCell()
        .storeUint(counters[0], 16)
        .storeUint(counters[1], 16)
        .storeUint(counters[2], 16)
        .storeUint(counters[3], 16)
        .storeUint(counters[4], 16)
        .storeUint(counters[5], 16)
        .storeUint(counters[6], 16)
        .endCell();

    const data = jetConfigToCell({
        adminAddress: '0:' + '1'.repeat(64),
        price: ticketPrice,
        refPercent: 10,
        tokenAddress: Address.parse('0:' + '2'.repeat(64)),
    });
    // replace counters in generated cell
    const ds = data.beginParse();
    ds.loadRef(); // discard default counters
    const rest = ds;

    const newData = beginCell()
        .storeRef(countersCell)
        .storeSlice(rest)
        .endCell();

    const sc = await SmartContract.fromCell(code, newData, {
        debug: true,
        override: {
            rand: () => options?.rand ?? 0,
            jetton_decimals: () => 1_000_000n,
            outer_fee: () => 0n,
        },
    });
    return sc;
}

describe('recv_internal direct', () => {
    it('ticket without excess triggers prize', async () => {
        const contract = await createContract({ rand: 1 });
        const player = Address.parse('0:' + '3'.repeat(64));
        const payload = beginCell().storeAddress(player).endCell();
        const body = buildJettonTransfer(ticketPrice, player, payload);
        const msg = internal({ to: contract.address, from: player, value: playerFee, bounce: true, body });
        const trace = await contract.sendInternalMessage(msg);
        expect(trace.exitCode).toBe(0);
        expect(trace.outMessages).toHaveLength(1);
        const fwd = trace.outMessages[0].body.beginParse().loadRef().beginParse();
        expect(fwd.loadUint(32)).toBe(0x5052495a);
    });


    it('skips transfer when prizes exhausted', async () => {
        const counters = [0, 3, 10, 35, 35, 30, 7];
        const contract = await createContract({ counters, rand: 1 });
        const player = Address.parse('0:' + '3'.repeat(64));
        const payload = beginCell().storeAddress(player).endCell();
        const body = buildJettonTransfer(ticketPrice, player, payload);
        const msg = internal({ to: contract.address, from: player, value: playerFee, bounce: true, body });
        const trace = await contract.sendInternalMessage(msg);
        expect(trace.exitCode).toBe(0);
        expect(trace.outMessages.length).toBe(0);
    });

    it('pays referral', async () => {
        const contract = await createContract({ rand: 119 });
        const player = Address.parse('0:' + '3'.repeat(64));
        const referral = Address.parse('0:' + '4'.repeat(64));
        const payload = beginCell().storeAddress(player).storeAddress(referral).endCell();
        const body = buildJettonTransfer(ticketPrice, player, payload);
        const msg = internal({ to: contract.address, from: player, value: playerFee, bounce: true, body });
        const trace = await contract.sendInternalMessage(msg);
        expect(trace.exitCode).toBe(0);
        expect(trace.outMessages).toHaveLength(1);
        const out = trace.outMessages[0];
        expect(out.info.dest?.toString()).toBe('0:' + '2'.repeat(64));
        const slice = out.body.beginParse();
        expect(slice.loadUint(32)).toBe(0x0f8a7ea5);
        slice.loadUint(64); // query id
        expect(slice.loadCoins()).toBe(1_000_000n);
        expect(slice.loadAddress().toString()).toBe(referral.toString());
    });

    it('accepts null referral address', async () => {
        const contract = await createContract({ rand: 1 });
        const player = Address.parse('0:' + '3'.repeat(64));
        const payload = beginCell()
            .storeAddress(player)
            .storeAddress(Address.parse('0:' + '0'.repeat(64)))
            .endCell();
        const body = buildJettonTransfer(ticketPrice, player, payload);
        const msg = internal({ to: contract.address, from: player, value: playerFee, bounce: true, body });
        const trace = await contract.sendInternalMessage(msg);
        expect(trace.exitCode).toBe(0);
    });

});

