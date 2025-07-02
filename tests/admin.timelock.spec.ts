import { JetContract } from '../helpers';
import '@ton/test-utils';

describe('jet.fc – admin timelock', () => {
  it('changes admin after timelock', async () => {
    const jet = await JetContract.deploy();
    const newAdmin = await jet.blockchain.treasury('new-admin');

    const r1 = await jet.contract.sendScheduleAdminChange(jet.deployer.getSender(), newAdmin.address, 1n);
    const r2 = await jet.contract.sendExecuteAdminChange(jet.deployer.getSender(), 1n);
    expect(r1.transactions).toHaveTransaction({ exitCode: 0 });
    expect(r2.transactions).toHaveTransaction({ exitCode: 0 });

    const data = await jet.contract.getFullData();
    expect(data.admin).not.toBeNull();
  });

  it('cancels scheduled admin change', async () => {
    const jet = await JetContract.deploy();
    const newAdmin = await jet.blockchain.treasury('newer-admin');

    const c1 = await jet.contract.sendScheduleAdminChange(jet.deployer.getSender(), newAdmin.address, 1n);
    const c2 = await jet.contract.sendCancelAdminChange(jet.deployer.getSender(), 1n);
    expect(c1.transactions).toHaveTransaction({ exitCode: 0 });
    expect(c2.transactions).toHaveTransaction({ exitCode: 0 });

    const data = await jet.contract.getFullData();
    expect(data.admin?.equals(jet.deployer.address)).toBe(true);
  });
});
