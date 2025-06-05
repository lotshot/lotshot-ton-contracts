/* --------------------------------------------------------------------------
 *  JettonMaster wrapper (TIP-3.1) – минимально-достаточный для деплоя
 *  и тестов USDT-Jetton’ом.
 * ------------------------------------------------------------------------*/

import { Address, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode, beginCell } from '@ton/core';

/* ------------------------------------------------------------------ */
/*  CONFIG  → init-data (нужно только для sandbox-тестов)            */
/* ------------------------------------------------------------------ */
export type JettonMasterConfig = {
    admin: Address; // владелец мастера / минтер
    content: Cell; // off-chain контент (IPFS/JSON)
    symbol: string; // «USDT»
    decimals: number; // 6
};

export function jettonMasterConfigToCell(cfg: JettonMasterConfig): Cell {
    return beginCell()
        .storeUint(0, 2) // пустая опция (00)
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

    /* открыть уже деплоенный мастер */
    static createFromAddress(addr: Address) {
        return new JettonMaster(addr);
    }

    /* сформировать init-структуру (sandbox) */
    static createFromConfig(cfg: JettonMasterConfig, code: Cell, workchain = 0) {
        const data = jettonMasterConfigToCell(cfg);
        const init = { code, data };
        return new JettonMaster(contractAddress(workchain, init), init);
    }

    /* -----------------  DEPLOY  (для тестовой среды)  -------------- */
    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(), // пустой body
        });
    }

    /* ---------------  TIP-3.1 get_wallet_address()  ---------------- */
    async getWalletAddress(provider: ContractProvider, owner: Address): Promise<Address> {
        const res = await provider.get('get_wallet_address', [
            { type: 'slice', cell: beginCell().storeAddress(owner).endCell() },
        ]);
        return res.stack.readAddress();
    }

    async sendDeployWallet(provider: ContractProvider, via: Sender, owner: Address, value: bigint) {
        const body = beginCell().storeUint(0x0c0d5934, 32).storeUint(0, 64).storeAddress(owner).endCell();
        await provider.internal(via, { value, body });
    }

    /* ---------------- MINT (для e2e-тестов) ------------------------ */
    async mint(provider: ContractProvider, via: Sender, walletAddr: Address, amount: bigint) {
        const body = beginCell()
            .storeUint(21, 32) // op-код mint (произвольный)
            .storeUint(0, 64)
            .storeAddress(walletAddr)
            .storeUint(amount, 128)
            .endCell();

        await provider.internal(via, {
            value: 100_000_000n, // 0.1 TON  (bigint!)
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body,
        });
    }

    // Helper with "send" prefix for SandboxContract compatibility
    async sendMint(provider: ContractProvider, via: Sender, walletAddr: Address, amount: bigint) {
        await this.mint(provider, via, walletAddr, amount);
    }
}
