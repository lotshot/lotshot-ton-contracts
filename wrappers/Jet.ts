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
    OP_ADMIN_DEPOSIT,
} from './opcodes';

export type JetConfig = {
    collectionAddress: Address;
    adminAddress: string;
    price: number;
    refPercent: number;     // referral % (0-100)
    jackpotAmount?: number; // TON
    timelockDelay?: number; // seconds
};

export function jetConfigToCell(config: JetConfig): Cell {
    const jackpotAmount = config.jackpotAmount ?? 1_000;
    const timelockDelay = config.timelockDelay ?? 86_400;

    const counters = beginCell()
        .storeUint(0, 16)
        .storeUint(0, 16)
        .storeUint(0, 16)
        .storeUint(0, 16)
        .storeUint(0, 16)
        .storeUint(0, 16)
        .storeUint(0, 16)
        .endCell();

    const timelock = beginCell()
        .storeCoins(0) // tl_ton_amount
        .storeUint(0, 64) // tl_ton_until
        .storeUint(timelockDelay, 64)
        .storeAddress(null) // new_admin_address
        .storeUint(0, 64) // tl_admin_until
        .endCell();

    return (
        beginCell()
            .storeRef(counters)
            .storeRef(timelock)
            .storeUint(0, 64) // next_ticket_index
            .storeAddress(config.collectionAddress)
            .storeAddress(Address.parse(config.adminAddress))
            .storeCoins(toNano(config.price))
            .storeUint(config.refPercent, 16)
            .storeCoins(toNano(jackpotAmount))
            .storeCoins(0) // locked_jp_coins
            .storeUint(0, 1) // jackpot_locked_once
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

    async sendAdminDeposit(provider: ContractProvider, via: Sender, value: bigint) {
        const body = beginCell()
            .storeUint(OP_ADMIN_DEPOSIT, 32)
            .storeUint(0, 64)
            .endCell();

        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }
}
