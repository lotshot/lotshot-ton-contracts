/* --------------------------------------------------------------------------
 *  JettonMaster wrapper (TIP-3.1) – simple helper for deploying
 *  and testing the USDT Jetton.
 * ------------------------------------------------------------------------*/

import {
    Address,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    beginCell,
} from '@ton/core';

/* ------------------------------------------------------------------ */
/*  CONFIG  → init data (only for sandbox tests)                     */
/* ------------------------------------------------------------------ */
export type JettonMasterConfig = {
    admin: Address;   // master owner / minter
    content: Cell;    // off-chain content (IPFS/JSON)
    symbol: string;   // "USDT"
    decimals: number; // 6
};

export function jettonMasterConfigToCell(cfg: JettonMasterConfig): Cell {
    return beginCell()
        .storeUint(0, 2)                 // empty option (00)
        .storeAddress(cfg.admin)
        .storeRef(cfg.content)
        .storeUint(cfg.decimals, 8)
        .storeStringRefTail(cfg.symbol)
    .endCell();
}

/* ------------------------------------------------------------------ */
/*  JettonMaster contract wrapper                                     */
/* ------------------------------------------------------------------ */
export class JettonMaster implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    /* open already deployed master */
    static createFromAddress(addr: Address) {
        return new JettonMaster(addr);
    }

    /* create init data (sandbox) */
    static createFromConfig(
        cfg: JettonMasterConfig,
        code: Cell,
        workchain = 0,
    ) {
        const data = jettonMasterConfigToCell(cfg);
        const init = { code, data };
        return new JettonMaster(contractAddress(workchain, init), init);
    }

    /* -----------------  DEPLOY  (for tests)  ----------------------- */
    async sendDeploy(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(), // empty body
        });
    }

    /* ---------------  TIP-3.1 get_wallet_address()  ---------------- */
    async getWalletAddress(
        provider: ContractProvider,
        owner: Address,
    ): Promise<Address> {
        const res = await provider.get('get_wallet_address', [
            { type: 'slice', cell: beginCell().storeAddress(owner).endCell() },
        ]);
        return res.stack.readAddress();
    }

    async sendDeployWallet(
        provider: ContractProvider,
        via: Sender,
        owner: Address,
        value: bigint,
    ) {
        const body = beginCell()
            .storeUint(0x0c0d5934, 32)
            .storeUint(0, 64)
            .storeAddress(owner)
            .endCell();
        await provider.internal(via, { value, body });
    }

    /* ---------------- MINT (for e2e tests) ------------------------ */
async mint(
    provider: ContractProvider,
    via: Sender,
    walletAddr: Address,
    amount: bigint,
) {
    const body = beginCell()
        .storeUint(21, 32)        // mint opcode (arbitrary)
        .storeUint(0, 64)
        .storeAddress(walletAddr)
        .storeUint(amount, 128)
    .endCell();

    await provider.internal(via, {
        value: 100_000_000n,      // 0.1 TON (bigint!)
        sendMode: SendMode.PAY_GAS_SEPARATELY,
        body,
    });
}

}
