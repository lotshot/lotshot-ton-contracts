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

async function createContract(options?: { counters?: number[]; refPercent?: number; rand?: number }) {
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
        collectionAddress: Address.parse('0:' + '0'.repeat(64)),
        adminAddress: '0:' + '1'.repeat(64),
        price: ticketPrice,
        refPercent: options?.refPercent ?? 0,
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
            transfer_fee: () => 0n,
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

    it('pays referral address when provided', async () => {
        const contract = await createContract({ refPercent: 10, rand: 1 });
        const player = Address.parse('0:' + '3'.repeat(64));
        const ref = Address.parse('0:' + '4'.repeat(64));
        const payload = beginCell().storeAddress(player).storeAddress(ref).endCell();
        const body = buildJettonTransfer(ticketPrice, player, payload);
        const msg = internal({ to: contract.address, from: player, value: playerFee, bounce: true, body });
        const trace = await contract.sendInternalMessage(msg);
        expect(trace.exitCode).toBe(0);
        const hasRefTransfer = trace.outMessages.some(m => m.info.dest?.toString() === ref.toString());
        expect(hasRefTransfer).toBe(true);
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

    it('handles USDT style transfer with ref payload', async () => {
        const contract = await createContract({ refPercent: 10, rand: 1 });
        const player = Address.parse('0:' + '3'.repeat(64));
        const ref = Address.parse('0:' + '4'.repeat(64));
        const payload = beginCell().storeAddress(ref).endCell();
        const body = buildJettonTransfer(ticketPrice, player, payload);
        const msg = internal({ to: contract.address, from: player, value: playerFee, bounce: true, body, state: null, isRight: true });
        const trace = await contract.sendInternalMessage(msg);
        expect(trace.exitCode).toBe(0);
    });
});

