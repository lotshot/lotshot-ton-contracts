import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, fromNano, internal, toNano } from '@ton/core';
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

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
    });

    it('should deploy', async () => {});

    it.skip('pays out prizes', async () => {
        const collection = await blockchain.treasury('collection');

        const jpAmount = toNano('10');
        const tlDelayTon = 3600n;

        expect(() =>
            beginCell()
                .storeRef(
                    beginCell()
                        .storeUint(0, 16)
                        .storeUint(0, 16)
                        .storeUint(0, 16)
                        .storeUint(0, 16)
                        .storeUint(0, 16)
                        .storeUint(0, 16)
                        .storeUint(0, 16)
                        .endCell(),
                )
                .storeUint(0, 64)
                .storeAddress(collection.address)
                .storeAddress(deployer.address)
                .storeCoins(toNano('0.25'))
                .storeUint(0, 16)
                .storeUint(jpAmount, 128)
                .storeUint(0n, 128)
                .storeUint(0n, 128)
                .storeUint(0n, 64)
                .storeUint(tlDelayTon, 64)
                .endCell(),
        ).toThrow();
    });
});
