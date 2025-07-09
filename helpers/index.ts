import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Address, Cell, toNano } from '@ton/core';
import { compile } from '@ton/blueprint';
import { Jet } from '../wrappers/Jet';
import { OP_JETTON_TRANSFER_NOTIFICATION, OP_ADMIN_DEPOSIT } from '../wrappers/opcodes';

export function buildJettonTransferNotif(opts: { from: Address; amount: bigint; payload: Cell }): Cell {
    return beginCell()
        .storeUint(OP_JETTON_TRANSFER_NOTIFICATION, 32)
        .storeUint(0, 64)
        .storeCoins(opts.amount)
        .storeAddress(opts.from)
        .storeUint(1, 1)
        .storeRef(opts.payload)
        .endCell();
}

export class JetContract {
    readonly blockchain: Blockchain;
    readonly deployer: SandboxContract<TreasuryContract>;
    readonly tokenWallet: { address: Address; sendInternalMessage: (body: Cell) => Promise<void> };
    readonly contract: SandboxContract<Jet>;
    readonly ticketPrice: bigint;

    private constructor(
        blockchain: Blockchain,
        deployer: SandboxContract<TreasuryContract>,
        tokenWallet: SandboxContract<TreasuryContract>,
        contract: SandboxContract<Jet>,
        ticketPrice: bigint,
    ) {
        this.blockchain = blockchain;
        this.deployer = deployer;
        this.ticketPrice = ticketPrice;
        this.contract = contract;
        this.tokenWallet = {
            address: tokenWallet.address,
            sendInternalMessage: async (body: Cell) => {
                await tokenWallet.send({
                    to: contract.address,
                    value: toNano('0.39'),
                    body,
                });
            },
        };
    }

    static async deploy(ticketPrice: bigint = 1000n): Promise<JetContract> {
        const blockchain = await Blockchain.create();
        const deployer = await blockchain.treasury('deployer');
        const tokenWallet = await blockchain.treasury('token-wallet');

        const code = await compile('Jet');
        const contract = blockchain.openContract(
            Jet.createFromConfig(
                {
                    collectionAddress: deployer.address,
                    adminAddress: deployer.address.toString(),
                    price: ticketPrice,
                    refPercent: 0,
                    tokenAddress: tokenWallet.address,
                    jpAmount: 0n,
                    lockedJpTokens: 0n,
                    tokenBalance: 0n,
                },
                code,
            ),
        );

        await contract.sendDeploy(deployer.getSender(), toNano('0.39'));
        return new JetContract(blockchain, deployer, tokenWallet, contract, ticketPrice);
    }

    buildBuyPayload(): Cell {
        return beginCell().storeAddress(this.deployer.address).endCell();
    }

    async deposit(amount: bigint) {
        const payload = beginCell().storeUint(OP_ADMIN_DEPOSIT, 32).endCell();
        const body = buildJettonTransferNotif({
            from: this.tokenWallet.address,
            amount,
            payload,
        });
        await this.tokenWallet.sendInternalMessage(body);
    }
}
