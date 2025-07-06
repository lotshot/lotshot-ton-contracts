import { JetContract } from '../helpers';
import { toNano } from '@ton/core';
import '@ton/test-utils';

describe('jet.fc – admin top-up', () => {
  it('increases token balance', async () => {
    const jet = await JetContract.deploy();
    const before = await jet.contract.getFullData();
    const r = await jet.contract.sendTopUpUSDT(jet.deployer.getSender(), 1_000_000n, toNano('0.06'));
    expect(r.transactions).toHaveTransaction({ exitCode: 0 });
    const after = await jet.contract.getFullData();
    expect(after.tokenBalance - before.tokenBalance).toBe(1_000_000n);
    expect(after.nextIndex).toEqual(before.nextIndex);
    expect(after.counters.hash()).toEqual(before.counters.hash());
  });

  it('rejects non-admin', async () => {
    const jet = await JetContract.deploy();
    const user = await jet.blockchain.treasury('usr');
    const res = await jet.contract.sendTopUpUSDT(user.getSender(), 1_000_000n, toNano('0.06'));
    expect(res.transactions).toHaveTransaction({ exitCode: 401 });
  });
});
