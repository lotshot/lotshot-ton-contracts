import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { OP_SCHEDULE_USDT, OP_EXEC_USDT, OP_SCHEDULE_ADMIN, OP_EXEC_ADMIN, OP_CANCEL_ADMIN, OP_SCHEDULE_TON, OP_EXEC_TON } from "./opcodes";

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
    tlTonAmount?: bigint;
    tlTonUntil?: bigint;
    newAdminAddress?: Address;
    tlAdminUntil?: bigint;
};

export function jetConfigToCell(config: JetConfig): Cell {
    const walletRef = beginCell().storeAddress(config.tokenAddress).endCell();
    const extraRef = beginCell()
        .storeCoins(config.jpAmount ?? 0n)
        .storeCoins(config.lockedJpTokens ?? 0n)
        .storeCoins(config.tokenBalance ?? 0n)
        .storeCoins(config.tlUsdtAmount ?? 0n)
        .storeUint(config.tlUsdtUntil ?? 0n, 64)
        .storeUint(config.tlDelay ?? 0n, 64)
        .storeCoins(config.tlTonAmount ?? 0n)
        .storeUint(config.tlTonUntil ?? 0n, 64)
        .endCell();

    const countersRef = beginCell()
        .storeUint(0, 16)
        .storeUint(0, 16)
        .storeUint(0, 16)
        .storeUint(0, 16)
        .storeUint(0, 16)
        .storeUint(0, 16)
        .storeUint(0, 16)
        .endCell();

    const adminTransferRef = beginCell()
        .storeAddress(config.newAdminAddress ?? null)
        .storeUint(config.tlAdminUntil ?? 0n, 64)
        .endCell();

    return (
        beginCell()
            .storeRef(countersRef)
            .storeRef(adminTransferRef)
            .storeUint(0, 64)
            .storeAddress(config.collectionAddress)
            .storeAddress(Address.parse(config.adminAddress))
            .storeCoins(config.price)
            .storeUint(config.refPercent, 8)
            .storeRef(walletRef)
            .storeRef(extraRef)
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

    async sendScheduleTON(provider: ContractProvider, via: Sender, amount: bigint, value: bigint) {
        const body = beginCell()
            .storeUint(OP_SCHEDULE_TON, 32)
            .storeUint(0, 64)
            .storeUint(amount, 64)
            .endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    async sendExecuteTON(provider: ContractProvider, via: Sender, value: bigint) {
        const body = beginCell()
            .storeUint(OP_EXEC_TON, 32)
            .storeUint(0, 64)
            .endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    async sendScheduleAdminChange(provider: ContractProvider, via: Sender, newAdmin: Address, value: bigint) {
        const body = beginCell()
            .storeUint(OP_SCHEDULE_ADMIN, 32)
            .storeUint(0, 64)
            .storeAddress(newAdmin)
            .endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    async sendExecuteAdminChange(provider: ContractProvider, via: Sender, value: bigint) {
        const body = beginCell()
            .storeUint(OP_EXEC_ADMIN, 32)
            .storeUint(0, 64)
            .endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    async sendCancelAdminChange(provider: ContractProvider, via: Sender, value: bigint) {
        const body = beginCell()
            .storeUint(OP_CANCEL_ADMIN, 32)
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

    async getFullData(provider: ContractProvider) {
        const res = await provider.get('get_full_data', []);
        return {
            counters: res.stack.readCell(),
            adminPending: res.stack.readCell(),
            nextIndex: res.stack.readBigNumber(),
            collection: res.stack.readAddressOpt(),
            admin: res.stack.readAddress(),
            price: res.stack.readBigNumber(),
            refPercent: res.stack.readNumber(),
            tokenWallet: res.stack.readAddressOpt(),
            jpAmount: res.stack.readBigNumber(),
            lockedJpTokens: res.stack.readBigNumber(),
            tokenBalance: res.stack.readBigNumber(),
            tlUsdtAmount: res.stack.readBigNumber(),
            tlUsdtUntil: res.stack.readBigNumber(),
            tlDelay: res.stack.readBigNumber(),
            tlTonAmount: res.stack.readBigNumber(),
            tlTonUntil: res.stack.readBigNumber(),
        };
    }
}
