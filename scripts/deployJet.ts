import { Address, beginCell, toNano } from '@ton/core';
import { Jet } from '../wrappers/Jet';
import { JettonMaster } from '../wrappers/JettonMaster';
import { JettonWallet } from '../wrappers/JettonWallet';
import { OP_NOTIFY_TOPUP } from '../wrappers/opcodes';
import { compile, NetworkProvider } from '@ton/blueprint';
import { Collection } from '../wrappers/Collection';
import * as readline from 'readline';

// Collection parameters.
export const collectionConfig = {
    owner: process.env.COLLECTION_OWNER || '', // Collection owner address, receives royalties
    royalty: 10, // Royalty size: 10 means 10%
    content: 'ipfs://bafybeidk355qgbty7amukruuhaptqc5kadxs2m65jtxgabgzexmetdqwsq', // Path to metadata storage, e.g. 'ipfs://bafybeif2afmx74slkwx5iqzvjaa5hmmzwrx7i2po4sds3cv4ojx23kclyu'
};

export async function run(provider: NetworkProvider) {
    const collection = provider.open(Collection.createFromConfig(collectionConfig, await compile('Collection')));

    const lotteryConfig = {
        collectionAddress: collection.address, // Collection address will be inserted automatically
        adminAddress: process.env.ADMIN_ADDRESS || '', // Admin address for the lottery
        price: BigInt(process.env.TICKET_PRICE || '10000000'), // Ticket cost in jettons
        refPercent: Number(process.env.REF_PERCENT || '0'), // Fee in %
        tokenAddress: Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000'),
    };

    const jettonMaster = provider.open(
        JettonMaster.createFromAddress(Address.parse(process.env.TOKEN_ADDRESS || '')),
    );

    const code = await compile('Jet');
    const network = provider.network();
    const jpUsdt = process.env.JACKPOT_AMOUNT_USDT
        ? BigInt(process.env.JACKPOT_AMOUNT_USDT)
        : (network === 'mainnet' ? 10_000n : 100n);

    // timelock delay (seconds)
    const tlDelay = process.env.TIMELOCK_DELAY_SEC
        ? BigInt(process.env.TIMELOCK_DELAY_SEC)
        : (network === 'mainnet' ? 172800n : 3600n);   // 48h / 1h

    const jetConfig = {
        collectionAddress: lotteryConfig.collectionAddress,
        adminAddress: lotteryConfig.adminAddress,
        price: lotteryConfig.price,
        refPercent: lotteryConfig.refPercent,
        tokenAddress: lotteryConfig.tokenAddress,
        jpAmount: jpUsdt,
        lockedJpTokens: 0n,
        tokenBalance: 0n,
        tlUsdtAmount: 0n,
        tlUsdtUntil: 0n,
        tlDelay,
        tlTonAmount: 0n,
        tlTonUntil: 0n,
    };

    const jet = provider.open(Jet.createFromConfig(jetConfig, code));

    // await deploy();
    // await setLotteryAddress();
    // await setTokenWallet();


    // await scheduleTONWithdrawal();   // Schedule TON withdrawal
    // await executeTONWithdrawal();    // Execute scheduled TON withdrawal
    // await scheduleUSDTWithdrawal(); // Schedule USDT withdrawal
    // await executeUSDTWithdrawal();  // Execute scheduled withdrawal
    // await topUpUSDT();            // Top up lottery USDT balance
    // await scheduleAdminChange();    // Schedule admin change
    // await executeAdminChange();     // Execute scheduled admin change





    // This function deploys the lottery contract
    async function deploy() {
        await jet.sendDeploy(provider.sender(), toNano('0.1'));
    }

    // The transaction grants mint permission to the lottery contract
    async function setLotteryAddress() {
        await provider.sender().send({
            to: collection.address,
            value: toNano('0.05'),
           body: beginCell().storeUint(2, 32).storeUint(0, 64).storeAddress(jet.address).endCell(),
        });
    }

    // Writes the lottery jetton wallet address to the contract
    async function setTokenWallet() {
        const wallet = await jettonMaster.getWalletAddress(jet.address);
        console.log('📦 Jetton wallet address for lottery:', wallet.toString());
        console.log('🎯 Jet address (lottery contract):', jet.address.toString());
        console.log('🏦 Jetton master address:', jettonMaster.address.toString());

        await jet.sendSetTokenWalletAddress(provider.sender(), wallet, toNano('0.01'));
        console.log('✅ Token wallet address sent to lottery contract');
    }


    async function scheduleUSDTWithdrawal() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

        const amountStr = await ask('Amount to schedule (USDT): ');
        console.log(`Schedule withdrawal of ${amountStr} USDT`);
        const confirm = (await ask('Confirm schedule? (y/N) ')).toLowerCase();
        rl.close();

        if (confirm === 'y' || confirm === 'yes') {
            const amount = BigInt(amountStr);
            await jet.sendScheduleUSDT(provider.sender(), amount, toNano('0.1'));
            console.log('✅ Withdrawal scheduled');
        } else {
            console.log('Canceled');
        }
    }

    async function scheduleTONWithdrawal() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

        const amountStr = await ask('Amount to schedule (TON): ');
        console.log(`Schedule withdrawal of ${amountStr} TON`);
        const confirm = (await ask('Confirm schedule? (y/N) ')).toLowerCase();
        rl.close();

        if (confirm === 'y' || confirm === 'yes') {
            const amount = toNano(amountStr);
            await jet.sendScheduleTON(provider.sender(), amount, toNano('0.1'));
            console.log('✅ Withdrawal scheduled');
        } else {
            console.log('Canceled');
        }
    }

    async function executeUSDTWithdrawal() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

        const confirm = (await ask('Execute scheduled withdrawal? (y/N) ')).toLowerCase();
        rl.close();

        if (confirm === 'y' || confirm === 'yes') {
            await jet.sendExecuteUSDT(provider.sender(), toNano('0.1'));
            console.log('✅ Scheduled withdrawal executed');
        } else {
            console.log('Canceled');
        }
    }

    async function topUpUSDT() {
        const amountStr = await new Promise<string>(res => {
            const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            rl.question('Amount to top-up (whole USDT): ', ans => { rl.close(); res(ans); });
        });

        const jettons = BigInt(amountStr) * 1_000_000n;

        const adminAddress = provider.sender().address;
        if (!adminAddress) throw new Error('Sender address missing');

        const adminWalletAddr = await jettonMaster.getWalletAddress(adminAddress);
        // Send jetton transfer directly to the lottery wallet of the lottery
        // contract. The Jetton wallet will forward a notification with
        // `notify_topup` to the lottery contract.
        const lotteryWalletAddr = await jettonMaster.getWalletAddress(jet.address);

        // Deploy the lottery jetton wallet in case it is not created yet
        await jettonMaster.sendDeployWallet(provider.sender(), jet.address, toNano('0.2'));
        await provider.waitForDeploy(lotteryWalletAddr);

        const adminWallet = provider.open(JettonWallet.createFromAddress(adminWalletAddr));
        const balance = await adminWallet.getBalance();
        if (balance < jettons) {
            throw new Error('Insufficient USDT balance');
        }

        const payload = beginCell()
            .storeUint(OP_NOTIFY_TOPUP, 32)
            .storeUint(0, 32) // placeholder for query id
            .endCell();
        // 0.31 TON is not enough if the lottery wallet is undeployed.
        // Increase the message value to cover state init and gas fees.
        await adminWallet.sendTransfer(provider.sender(), {
            to: lotteryWalletAddr,
            amount: jettons,
            value: toNano('0.55'),
            forwardTon: toNano('0.3'),
            forwardPayload: payload,
        });
        console.log(`✅ Topped up ${amountStr} USDT`);
    }

    async function executeTONWithdrawal() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

        const confirm = (await ask('Execute scheduled TON withdrawal? (y/N) ')).toLowerCase();
        rl.close();

        if (confirm === 'y' || confirm === 'yes') {
            await jet.sendExecuteTON(provider.sender(), toNano('0.1'));
            console.log('✅ Scheduled TON withdrawal executed');
        } else {
            console.log('Canceled');
        }
    }

    async function scheduleAdminChange() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

        const newAdmin = await ask('New admin address: ');
        console.log(`Schedule admin change to ${newAdmin}`);
        const confirm = (await ask('Confirm schedule? (y/N) ')).toLowerCase();
        rl.close();

        if (confirm === 'y' || confirm === 'yes') {
            await jet.sendScheduleAdminChange(provider.sender(), Address.parse(newAdmin), toNano('0.1'));
            console.log('✅ Admin change scheduled');
        } else {
            console.log('Canceled');
        }
    }

    async function executeAdminChange() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

        const confirm = (await ask('Execute scheduled admin change? (y/N) ')).toLowerCase();
        rl.close();

        if (confirm === 'y' || confirm === 'yes') {
            await jet.sendExecuteAdminChange(provider.sender(), toNano('0.1'));
            console.log('✅ Scheduled admin change executed');
        } else {
            console.log('Canceled');
        }
    }


    await provider.waitForDeploy(jet.address);
}
