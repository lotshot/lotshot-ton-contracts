import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import { Jet } from '../wrappers/Jet';
import { OP_JETTON_TRANSFER_NOTIFICATION } from './opcodes';
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
    const ticketPrice = 1000n;

    async function sendTicket(player: SandboxContract<TreasuryContract>) {
        const body = beginCell()
            .storeUint(OP_JETTON_TRANSFER_NOTIFICATION, 32)
            .storeUint(0, 64)
            .storeCoins(ticketPrice)
            .storeAddress(player.address)
            .storeUint(0, 1)
            .storeAddress(player.address)
            .endCell();

        await deployer.send({
            to: jet.address,
            value: toNano('0.39'),
            body,
        });
    }

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');

        jet = blockchain.openContract(
            Jet.createFromConfig(
                {
                    collectionAddress: deployer.address,
                    adminAddress: deployer.address.toString(),
                    price: ticketPrice,
                    refPercent: 0,
                    tokenAddress: deployer.address,
                    jpAmount: 0n,
                    lockedJpTokens: 0n,
                    jackpotLockedOnce: false,
                    tokenBalance: 0n,
                },
                code,
            ),
        );

        const deployResult = await jet.sendDeploy(deployer.getSender(), toNano('0.39'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: jet.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // deployment assertions are handled in beforeEach
    });

    it('should handle draws and jackpot logic', async () => {
        const player = await blockchain.treasury('player');

        for (let i = 0; i < 10; i++) {
            await sendTicket(player);
        }

        const counters = await jet.getCounters();

        expect(Number(counters.major)).toBeLessThanOrEqual(2);
        expect(Number(counters.high)).toBeLessThanOrEqual(4);
        expect(Number(counters.mid)).toBeLessThanOrEqual(12);
        expect(Number(counters.lowMid)).toBeLessThanOrEqual(27);
        expect(Number(counters.low)).toBeLessThanOrEqual(47);
        expect(Number(counters.mini)).toBeLessThanOrEqual(152);

        const countersBefore = await jet.getCounters();

        await sendTicket(player);

        const after = await jet.getCounters();
        expect(Number(after.jackpot)).toBeGreaterThanOrEqual(Number(countersBefore.jackpot));
    });
});
