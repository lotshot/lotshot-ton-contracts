import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import { Jet } from '../wrappers/Jet';
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
            .storeUint(0x7362d09c, 32)
            .storeUint(0, 64)
            .storeCoins(ticketPrice)
            .storeAddress(player.address)
            .storeUint(0, 1)
            .storeAddress(player.address)
            .endCell();

        await deployer.send({
            to: jet.address,
            value: toNano('0.27'),
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
                },
                code,
            ),
        );

        const deployResult = await jet.sendDeploy(deployer.getSender(), toNano('0.27'));

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

    it.skip('should handle draws and jackpot logic', async () => {
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

        const before = await jet.getCounters();

        const finish = await jet.sendFinishRound(
            deployer.getSender(),
            player.address,
            toNano('0.27'),
        );
        expect(finish.transactions).toHaveTransaction({ exitCode: 0 });

        const after = await jet.getCounters();
        expect(Number(after.jackpot)).toBeGreaterThanOrEqual(Number(before.jackpot));

        await sendTicket(player);

        const final = await jet.getCounters();
        expect(Number(final.jackpot)).toBeGreaterThanOrEqual(Number(after.jackpot));
        expect(Number(final.major)).toBe(Number(after.major));
    });
});
