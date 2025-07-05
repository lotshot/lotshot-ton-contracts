import { Address, beginCell, Cell, Contract, ContractProvider, Sender, SendMode } from '@ton/core';

export class JettonWallet implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new JettonWallet(address);
    }

    async sendTransfer(
        provider: ContractProvider,
        via: Sender,
        params: {
            value: bigint;
            jettonAmount: bigint;
            to: Address;
            forwardTonAmount: bigint;
            forwardPayload?: Cell;
            responseAddress?: Address;
            queryId?: bigint;
        },
    ): Promise<void> {
        const body = beginCell()
            .storeUint(0xf8a7ea5, 32)
            .storeUint(params.queryId ?? 0n, 64)
            .storeCoins(params.jettonAmount)
            .storeAddress(params.to)
            .storeAddress(params.responseAddress ?? (via.address as Address))
            .storeBit(0) // no custom payload
            .storeCoins(params.forwardTonAmount)
            .storeBit(1) // forward_payload as ref
            .storeRef(params.forwardPayload ?? beginCell().endCell())
            .endCell();

        await provider.internal(via, {
            value: params.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            bounce: true,
            body,
        });
    }
}
