import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type JetConfig = {
    collectionAddress: Address;
    adminAddress: string;
    price: bigint;
    refPercent: number;
    tokenAddress: Address;
};

export function jetConfigToCell(config: JetConfig): Cell {
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
            .endCell()
        )
        .storeUint(0, 64)
        .storeAddress(config.collectionAddress)
        .storeAddress(Address.parse(config.adminAddress))
        .storeUint(config.price, 128)
        .storeUint(config.refPercent, 16)
        .storeAddress(config.tokenAddress)
        .endCell()
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

    async sendSetTokenWalletAddress(
        provider: ContractProvider,
        via: Sender,
        wallet: Address,
        value: bigint,
    ) {
        const body = beginCell()
            .storeUint(5, 32)
            .storeUint(0, 64)
            .storeAddress(wallet)
            .endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    async sendUSDT(
        provider: ContractProvider,
        via: Sender,
        recipient: Address,
        amount: bigint,
        value: bigint,
    ) {
        const body = beginCell()
            .storeUint(0x55534454, 32)
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

    async sendWithdraw(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
    ) {
        const body = beginCell()
            .storeUint(2, 32)
            .storeUint(0, 64)
            .endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    async sendFinishRound(
        provider: ContractProvider,
        via: Sender,
        winner: Address,
        value: bigint,
    ) {
        const body = beginCell()
            .storeUint(4, 32)
            .storeUint(0, 64)
            .storeAddress(winner)
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
