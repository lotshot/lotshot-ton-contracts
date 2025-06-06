import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type JetConfig = {
    adminAddress: string;
    price: bigint;
    refPercent: number;
    tokenAddress: Address;
    collectionAddress?: Address;
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
        .storeAddress(Address.parse(config.adminAddress))
        .storeUint(config.price, 128)
        .storeUint(config.refPercent, 16)
        .storeAddress(config.tokenAddress)
        .storeAddress(config.collectionAddress ?? Address.parse('0:' + '0'.repeat(64)))
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

    async sendChangeAdminAddress(
        provider: ContractProvider,
        via: Sender,
        newAdmin: Address,
        value: bigint,
    ) {
        const body = beginCell()
            .storeUint(3, 32)
            .storeUint(0, 64)
            .storeAddress(newAdmin)
            .endCell();
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    async getFullData(provider: ContractProvider) {
        const res = await provider.get('get_full_data', []);
        return {
            counters: res.stack.readCell(),
            nextIndex: res.stack.readBigNumber(),
            collectionAddress: res.stack.readAddress(),
            adminAddress: res.stack.readAddress(),
            price: res.stack.readBigNumber(),
            refPercent: res.stack.readNumber(),
            tokenWalletAddress: res.stack.readAddress(),
        };
    }
}
