import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type JetConfig = {
    adminAddress: string;
    price: bigint;
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
        .storeAddress(Address.parse(config.adminAddress))
        .storeUint(config.price, 128)
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
}
