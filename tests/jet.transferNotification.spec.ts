import { Address } from 'ton-core';
import { JetContract, buildJettonTransferNotif } from '../helpers';
import '@ton/test-utils';

describe('jet.fc – sender validation', () => {
  it('accepts valid notification', async () => {
    const jet = await JetContract.deploy();
    const notif = buildJettonTransferNotif({
      from: jet.tokenWallet.address,
      amount: jet.ticketPrice,
      payload: jet.buildBuyPayload(),
    });
    await jet.tokenWallet.sendInternalMessage(notif);
  });

  it('rejects spoofed sender', async () => {
    const jet = await JetContract.deploy();
    const fake = await jet.blockchain.treasury('fake');
    const notif = buildJettonTransferNotif({
      from: fake.address,
      amount: jet.ticketPrice,
      payload: jet.buildBuyPayload(),
    });
    await expect(fake.send({ to: jet.contract.address, value: 100000000n, body: notif }))
      .to.be.revertedWith(401);
  });
});
