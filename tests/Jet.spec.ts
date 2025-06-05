import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano, internal } from '@ton/core';
import { Jet } from '../wrappers/Jet';
import { JettonMaster } from '../wrappers/JettonMaster';
import { JettonWallet } from '../wrappers/JettonWallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Jet', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Jet');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let jet: SandboxContract<Jet>;
    let jettonMaster: SandboxContract<JettonMaster>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        jettonMaster = blockchain.openContract(
            JettonMaster.createFromConfig(
                {
                    admin: deployer.address,
                    content: beginCell().endCell(),
                    symbol: 'USDT',
                    decimals: 6,
                },
                beginCell().endCell(),
            ),
        );

        await jettonMaster.sendDeploy(deployer.getSender(), toNano('0.05'));

        const wallet = await blockchain.treasury('lottery-wallet');

        jet = blockchain.openContract(
            Jet.createFromConfig(
                {
                    collectionAddress: deployer.address,
                    adminAddress: deployer.address.toString(),
                    price: 10n * 1_000_000n,
                    refPercent: 0,
                    tokenAddress: wallet.address,
                },
                code,
            ),
        );

        await jet.sendDeploy(deployer.getSender(), toNano('0.05'));
        await jet.sendSetTokenWalletAddress(deployer.getSender(), wallet.address, toNano('0.01'));

        await jettonMaster.sendMint(deployer.getSender(), wallet.address, 1_000_000_000n);
    });

    it('should send winnings', async () => {
        const player = await blockchain.treasury('player');
        const playerWallet = blockchain.openContract(
            JettonWallet.createFromAddress(Address.parseRaw(player.address.toString())),
        );

        const forwardPayload = beginCell().storeUint(0x5052495a, 32).storeUint(6, 8).endCell();

        const result = await playerWallet.sendTransfer(player.getSender(), {
            amount: 10n * 1_000_000n,
            destination: jet.address,
            responseAddress: player.address,
            forwardAmount: toNano('0.3'),
            forwardPayload,
        });

        expect(result.transactions).toHaveTransaction({
            from: jet.address,
            success: true,
        });
    });
});
