import { Address, beginCell, Cell, Contract, ContractProvider, Sender, SendMode } from '@ton/core';

export class JettonWallet implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new JettonWallet(address);
    }

    async sendTransfer(
        provider: ContractProvider,
        via: Sender,
        args: {
            amount: bigint;
            destination: Address;
            responseAddress: Address;
            forwardAmount: bigint;
            forwardPayload?: Cell;
        },
    ): Promise<void> {
        const body = beginCell()
            .storeUint(0xf8a7ea5, 32)
            .storeUint(0, 64)
            .storeCoins(args.amount)
            .storeAddress(args.destination)
            .storeAddress(args.responseAddress)
            .storeBit(0) // no custom payload
            .storeCoins(args.forwardAmount);
        if (args.forwardPayload) {
            body.storeUint(1, 1).storeRef(args.forwardPayload);
        } else {
            body.storeUint(0, 1);
        }
        return await provider.internal(via, {
            value: args.forwardAmount + 1n, // minimal value just to cover fees
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: body.endCell(),
        });
    }
}
