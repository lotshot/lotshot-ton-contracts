import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { OP_SEND_USDT, OP_SCHEDULE_USDT, OP_EXEC_USDT } from './opcodes';

export type JetConfig = {
    collectionAddress: Address;
    adminAddress: string;
    price: bigint;
    refPercent: number;
    tokenAddress: Address;
    jpAmount?: bigint;
    lockedJpTokens?: bigint;
    tokenBalance?: bigint;
    tlUsdtAmount?: bigint;
    tlUsdtUntil?: bigint;
    tlDelay?: bigint;
};

export function jetConfigToCell(config: JetConfig): Cell {
    return (
        beginCell()
            .storeRef(
                beginCell()
                    .storeUint(0, 16)
                    .storeUint(0, 16)
                    .storeUint(0, 16)
                    .storeUint(0, 16)
                    .storeUint(0, 16)
                    .storeUint(0, 16)
                    .storeUint(0, 16)
                    .endCell(),
            )
            .storeUint(0, 64)
            // collection and token wallet addresses are initially empty to fit 1023-bit limit
            .storeAddress(null)
            .storeAddress(Address.parse(config.adminAddress))
            .storeCoins(config.price)
            .storeUint(config.refPercent, 8)
            .storeAddress(null)
            .storeUint(config.jpAmount ?? 0n, 128)
            .storeUint(config.lockedJpTokens ?? 0n, 128)
            .storeUint(config.tokenBalance ?? 0n, 128)
            .storeUint(config.tlUsdtAmount ?? 0n, 128)
            .storeUint(config.tlUsdtUntil ?? 0n, 64)
            .storeUint(config.tlDelay ?? 0n, 64)
            .endCell()
    );
}

export class Jet implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Jet(address);
    }

    static createFromConfig(config: JetConfig, code: Cell, workchain = 0) {
        const data = jetConfigToCell(config);
        const init = { code, data };
        return new Jet(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendSetTokenWalletAddress(provider: ContractProvider, via: Sender, wallet: Address, value: bigint) {
        const body = beginCell().storeUint(5, 32).storeUint(0, 64).storeAddress(wallet).endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    async sendUSDT(provider: ContractProvider, via: Sender, recipient: Address, amount: bigint, value: bigint) {
        const body = beginCell()
            .storeUint(OP_SEND_USDT, 32)
            .storeUint(0, 64)
            .storeAddress(recipient)
            .storeUint(amount, 128)
            .endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    async sendWithdraw(provider: ContractProvider, via: Sender, value: bigint) {
        const body = beginCell().storeUint(2, 32).storeUint(0, 64).endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    async sendScheduleUSDT(provider: ContractProvider, via: Sender, amount: bigint, value: bigint) {
        const body = beginCell()
            .storeUint(OP_SCHEDULE_USDT, 32)
            .storeUint(0, 64)
            .storeUint(amount, 128)
            .endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    async sendExecuteUSDT(provider: ContractProvider, via: Sender, value: bigint) {
        const body = beginCell()
            .storeUint(OP_EXEC_USDT, 32)
            .storeUint(0, 64)
            .endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }


    async getCounters(provider: ContractProvider) {
        const res = await provider.get('get_counters', []);
        return {
            jackpot: res.stack.readBigNumber(),
            major: res.stack.readBigNumber(),
            high: res.stack.readBigNumber(),
            mid: res.stack.readBigNumber(),
            lowMid: res.stack.readBigNumber(),
            low: res.stack.readBigNumber(),
            mini: res.stack.readBigNumber(),
        };
    }
}
