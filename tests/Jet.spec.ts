
import { Blockchain, SandboxContract, TreasuryContract, BlockchainTransaction } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano, contractAddress } from '@ton/core';
import { Jet } from '../wrappers/Jet';
import { JettonMaster } from '../wrappers/JettonMaster';
import { JettonWallet } from '../wrappers/JettonWallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

function expectJettonTransfer(transactions: BlockchainTransaction[], toAddress: Address) {
    function hasTransfer(txs: BlockchainTransaction[]): boolean {
        for (const tx of txs) {
            const hasMsg =
                tx.description?.type === 'generic' &&
                tx.description?.actionPhase?.success &&
                [...tx.outMessages.keys()]
                    .map((k) => tx.outMessages.get(k))
                    .some((msg) => msg?.info?.dest?.toString() === toAddress.toString());

            if (hasMsg) {
                return true;
            }

            if (tx.children && hasTransfer(tx.children)) {
                return true;
            }
        }

        return false;
    }

    expect(hasTransfer(transactions)).toBe(true);
}

describe('Jet', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Jet');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let jet: SandboxContract<Jet>;
    let jettonMaster: SandboxContract<JettonMaster>;
    let jetWalletAddress: Address;

    const ticketPrice = 10n * 1_000_000n;

    async function deployLottery(options?: { counters?: number[] }) {
        const counters = options?.counters ?? [0, 0, 0, 0, 0, 0, 0];

        const countersCell = beginCell()
            .storeUint(counters[0], 16)
            .storeUint(counters[1], 16)
            .storeUint(counters[2], 16)
            .storeUint(counters[3], 16)
            .storeUint(counters[4], 16)
            .storeUint(counters[5], 16)
            .storeUint(counters[6], 16)
            .endCell();

        const data = beginCell()
            .storeRef(countersCell)
            .storeUint(0, 64)
            .storeAddress(deployer.address)
            .storeUint(ticketPrice, 128)
            .storeUint(10, 16)
            .storeAddress(deployer.address)
            .endCell();

        const init = { code, data };
        const contract = blockchain.openContract(new Jet(contractAddress(0, init), init));
        await contract.sendDeploy(deployer.getSender(), toNano('0.05'));
        return contract;
    }

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

        jet = await deployLottery();

        jetWalletAddress = await jettonMaster.getWalletAddress(jet.address);
        await jettonMaster.sendDeployWallet(deployer.getSender(), jet.address, toNano('0.05'));
        await jet.sendSetTokenWalletAddress(deployer.getSender(), jetWalletAddress, toNano('0.01'));

        await jettonMaster.sendMint(deployer.getSender(), jetWalletAddress, 1_000_000_000n);
    });

    it('should buy ticket without excess', async () => {
        const player = await blockchain.treasury('player');
        const playerWalletAddress = await jettonMaster.getWalletAddress(player.address);
        await jettonMaster.sendDeployWallet(deployer.getSender(), player.address, toNano('0.05'));
        await jettonMaster.sendMint(deployer.getSender(), playerWalletAddress, 20n * 1_000_000n);
        const playerWallet = blockchain.openContract(
            JettonWallet.createFromAddress(playerWalletAddress),
        );

        const forwardPayload = beginCell().storeAddress(player.address).endCell();

        const result = await playerWallet.sendTransfer(player.getSender(), {
            amount: ticketPrice,
            destination: jet.address,
            responseAddress: player.address,
            forwardAmount: toNano('0.3'),
            forwardPayload,
        });

        expectJettonTransfer(result.transactions, jet.address);
    });

    it('should return excess when overpaid', async () => {
        const player = await blockchain.treasury('player');
        const playerWalletAddress = await jettonMaster.getWalletAddress(player.address);
        await jettonMaster.sendDeployWallet(deployer.getSender(), player.address, toNano('0.05'));
        await jettonMaster.sendMint(deployer.getSender(), playerWalletAddress, 20n * 1_000_000n);
        const playerWallet = blockchain.openContract(
            JettonWallet.createFromAddress(playerWalletAddress),
        );

        const forwardPayload = beginCell().storeAddress(player.address).endCell();

        const result = await playerWallet.sendTransfer(player.getSender(), {
            amount: ticketPrice + 5n * 1_000_000n,
            destination: jet.address,
            responseAddress: player.address,
            forwardAmount: toNano('0.3'),
            forwardPayload,
        });

        expectJettonTransfer(result.transactions, playerWalletAddress);
    });

    it('should send winnings', async () => {
        const player = await blockchain.treasury('player');
        const playerWalletAddress = await jettonMaster.getWalletAddress(player.address);
        await jettonMaster.sendDeployWallet(deployer.getSender(), player.address, toNano('0.05'));
        await jettonMaster.sendMint(deployer.getSender(), playerWalletAddress, 20n * 1_000_000n);
        const playerWallet = blockchain.openContract(
            JettonWallet.createFromAddress(playerWalletAddress),
        );

        const forwardPayload = beginCell().storeUint(0x5052495a, 32).storeUint(6, 8).endCell();

        const result = await playerWallet.sendTransfer(player.getSender(), {
            amount: ticketPrice,
            destination: jet.address,
            responseAddress: player.address,
            forwardAmount: toNano('0.3'),
            forwardPayload,
        });

        expectJettonTransfer(result.transactions, playerWalletAddress);
    });


    it('should not send prize when limits exceeded', async () => {
        jet = await deployLottery({ counters: [0, 3, 10, 35, 35, 30, 7] });
        jetWalletAddress = await jettonMaster.getWalletAddress(jet.address);
        await jettonMaster.sendDeployWallet(deployer.getSender(), jet.address, toNano('0.05'));
        await jet.sendSetTokenWalletAddress(deployer.getSender(), jetWalletAddress, toNano('0.01'));
        await jettonMaster.sendMint(deployer.getSender(), jetWalletAddress, 1_000_000_000n);

        const player = await blockchain.treasury('player2');
        const playerWalletAddress = await jettonMaster.getWalletAddress(player.address);
        await jettonMaster.sendDeployWallet(deployer.getSender(), player.address, toNano('0.05'));
        await jettonMaster.sendMint(deployer.getSender(), playerWalletAddress, 20n * 1_000_000n);
        const playerWallet = blockchain.openContract(JettonWallet.createFromAddress(playerWalletAddress));

        const forwardPayload = beginCell().storeAddress(player.address).endCell();

        const result = await playerWallet.sendTransfer(player.getSender(), {
            amount: ticketPrice,
            destination: jet.address,
            responseAddress: player.address,
            forwardAmount: toNano('0.3'),
            forwardPayload,
        });

        const txToPlayer = result.transactions.find((tx) =>
            [...tx.outMessages.keys()]
                .map((k) => tx.outMessages.get(k))
                .some((msg) => msg?.info?.dest?.toString() === playerWalletAddress.toString())
        );
        expect(txToPlayer).toBeUndefined();
    });
});
