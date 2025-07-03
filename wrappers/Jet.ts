import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano,
} from '@ton/core';
import {
    OP_SCHEDULE_TON,
    OP_SCHEDULE_ADMIN,
    OP_EXEC_TON,
    OP_EXEC_ADMIN,
} from './opcodes';

export type JetConfig = {
    collectionAddress: Address;
    adminAddress: string;
    price: number;
    refPercent: number;
};

export function jetConfigToCell(config: JetConfig): Cell {
    const admin = Address.parse(config.adminAddress);

    return beginCell()
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
        .storeUint(0, 64) // next_ticket_index
        .storeAddress(config.collectionAddress)
        .storeAddress(admin)
        .storeCoins(toNano(config.price))
        .storeUint(config.refPercent, 16)
        .endCell();
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

    async sendScheduleAdminChange(provider: ContractProvider, via: Sender, newAdmin: Address | null, value: bigint) {
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

    async getCounters(provider: ContractProvider) {
        const result = await provider.get('get_counters', []);
        return {
            jp: result.stack.readNumber(),
            x200: result.stack.readNumber(),
            x77: result.stack.readNumber(),
            x20: result.stack.readNumber(),
            x7: result.stack.readNumber(),
            x3: result.stack.readNumber(),
            x1: result.stack.readNumber(),
        };
    }

    async getFullData(provider: ContractProvider) {
        const result = await provider.get('get_full_data', []);
        return {
            counters: result.stack.readCell(),
            nextTicketIndex: result.stack.readNumber(),
            collectionAddress: result.stack.readAddress(),
            adminAddress: result.stack.readAddress(),
            price: result.stack.readBigNumber(),
            refPercent: result.stack.readNumber(),
            jackpotAmount: result.stack.readBigNumber(),
            lockedJpCoins: result.stack.readBigNumber(),
        };
    }
}
