import { Address, beginCell, Cell, Contract, ContractProvider, Sender, SendMode } from '@ton/core';

export class JettonWallet implements Contract {
    readonly address: Address;

    constructor(address: Address) {
        this.address = address;
    }

    static createFromAddress(address: Address) {
        return new JettonWallet(address);
    }

    async getBalance(provider: ContractProvider): Promise<bigint> {
        const state = await provider.getState();
        if (state.state.type !== 'active') {
            return 0n;
        }
        const res = await provider.get('get_wallet_data', []);
        return res.stack.readBigNumber();
    }

    async sendTransfer(
        provider: ContractProvider,
        via: Sender,
        args: {
            to: Address;
            amount: bigint;
            value: bigint;
            forwardTon?: bigint;
            payload?: Cell;
            forwardPayload?: Cell;
            queryID?: bigint;
            responseAddress?: Address;
        },
    ) {
        const response = args.responseAddress ?? via.address;
        if (!response) throw new Error('Sender address required');
        const bodyBuilder = beginCell()
            .storeUint(0xf8a7ea5, 32) // jetton_transfer op
            .storeUint(args.queryID ?? 0n, 64)
            .storeCoins(args.amount)
            .storeAddress(args.to)
            .storeAddress(response)
        if (args.payload) {
            bodyBuilder.storeBit(1).storeRef(args.payload);
        } else {
            bodyBuilder.storeBit(0);
        }
        const body = bodyBuilder
            .storeCoins(args.forwardTon ?? 0n)
            .storeBit(args.forwardPayload ? 1 : 0)
            .storeMaybeRef(args.forwardPayload)
            .endCell();

        await provider.internal(via, {
            value: args.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }
}
