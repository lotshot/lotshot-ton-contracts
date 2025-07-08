import { JetContract } from '../helpers';
import { toNano } from '@ton/core';
import '@ton/test-utils';

describe('jet.fc – USDT execution access control', () => {
  it('only admin can execute scheduled USDT withdraw', async () => {
    const jet = await JetContract.deploy();
    const user = await jet.blockchain.treasury('user');

    await jet.deposit(1_000_000n); // deposit 1 token (10^6 decimals)
    await jet.contract.sendScheduleUSDT(jet.deployer.getSender(), 1n, toNano('0.1'));

    const fail = await jet.contract.sendExecuteUSDT(user.getSender(), toNano('0.1'));
    expect(fail.transactions).toHaveTransaction({ exitCode: 401 });

    const ok = await jet.contract.sendExecuteUSDT(jet.deployer.getSender(), toNano('0.1'));
    expect(ok.transactions).toHaveTransaction({ exitCode: 0 });
  });
});
