import { Address, beginCell, Cell, toNano, contractAddress } from '@ton/core';
import { Jet } from '../wrappers/Jet';
import { compile, NetworkProvider } from '@ton/blueprint';
import { Collection } from '../wrappers/Collection';
import * as readline from 'readline';

// Collection parameters
export const collectionConfig = {
    owner: process.env.COLLECTION_OWNER || '', // wallet that receives royalties
    royalty: 10, // royalty rate: 10% = 10
    content: 'ipfs://bafybeiat3wdd4rzuvlneugpx6tkrvlwor5nupox4dngjhjtifey6rxqcee', // path to metadata storage, e.g. 'ipfs://bafybeif2afmx74slkwx5iqzvjaa5hmmzwrx7i2po4sds3cv4ojx23kclyu'
};

export async function run(provider: NetworkProvider) {
    const collection = provider.open(Collection.createFromConfig(collectionConfig, await compile('Collection')));

    const lotteryConfig = {
        collectionAddress: collection.address, // collection address filled automatically
        adminAddress: process.env.ADMIN_ADDRESS || '', // lottery administrator address
        price: 0.25, // ticket price
        refPercent: Number(process.env.REF_PERCENT || '0'), // referral % (0-100)
        jackpotAmount: process.env.JACKPOT_AMOUNT_TON
            ? Number(process.env.JACKPOT_AMOUNT_TON)
            : undefined,
        timelockDelay: process.env.TIMELOCK_DELAY_SEC_TON
            ? Number(process.env.TIMELOCK_DELAY_SEC_TON)
            : undefined,
    };

    const jetCode = await compile('Jet');

    const jet = provider.open(
        Jet.createFromConfig(
            {
                collectionAddress: collection.address,
                adminAddress: lotteryConfig.adminAddress,
                price: lotteryConfig.price,
                refPercent: lotteryConfig.refPercent,
                jackpotAmount: lotteryConfig.jackpotAmount,
                timelockDelay: lotteryConfig.timelockDelay,
            },
            jetCode,
        ),
    );

    // Deploy Jet and grant minting rights
    // await deploy();
    // await setLotteryAddress();



    // await scheduleTONWithdrawal(); // schedule withdrawal interactively
    // await executeTONWithdrawal();
    // await scheduleAdminChange();    // Schedule admin change
    // await executeAdminChange();     // Execute scheduled admin change

    // Deploy the lottery contract
    async function deploy() {
        await jet.sendDeploy(provider.sender(), toNano('0.1'));
    }

    // Grant minting rights to the lottery contract
    async function setLotteryAddress() {
        await provider.sender().send({
            to: collection.address,
            value: toNano('0.01'),
            body: beginCell().storeUint(2, 32).storeUint(0, 64).storeAddress(jet.address).endCell(),
        });
    }

    // Schedule a TON withdrawal with a prompt
    async function scheduleTONWithdrawal() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

        const amount = await ask('Amount to schedule (TON, 0 to cancel): ');
        console.log(`Schedule withdrawal of ${amount} TON`);
        const confirm = (await ask('Confirm schedule? (y/N) ')).toLowerCase();
        rl.close();

        if (confirm === 'y' || confirm === 'yes') {
            await jet.sendScheduleTON(provider.sender(), toNano(amount), toNano('0.01'));
            console.log('✅ Withdrawal scheduled');
        } else {
            console.log('Canceled');
        }
    }

    // Execute the previously scheduled withdrawal after the timelock expires
    async function executeTONWithdrawal() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

        const confirm = (await ask('Execute scheduled TON withdrawal? (y/N) ')).toLowerCase();
        rl.close();

        if (confirm === 'y' || confirm === 'yes') {
            await jet.sendExecuteTON(provider.sender(), toNano('0.01'));
            console.log('✅ Scheduled withdrawal executed');
        } else {
            console.log('Canceled');
        }
    }

    // Schedule an admin change with a prompt
    async function scheduleAdminChange() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

        const newAdmin = await ask('New admin address (empty to cancel): ');
        console.log(`Schedule admin change to ${newAdmin || 'cancel'}`);
        const confirm = (await ask('Confirm schedule? (y/N) ')).toLowerCase();
        rl.close();

        if (confirm === 'y' || confirm === 'yes') {
            const addr = newAdmin ? Address.parse(newAdmin) : null;
            await jet.sendScheduleAdminChange(provider.sender(), addr, toNano('0.01'));
            console.log('✅ Admin change scheduled');
        } else {
            console.log('Canceled');
        }
    }

    // Execute the previously scheduled admin change
    async function executeAdminChange() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const ask = (q: string) => new Promise<string>(res => rl.question(q, res));

        const confirm = (await ask('Execute scheduled admin change? (y/N) ')).toLowerCase();
        rl.close();

        if (confirm === 'y' || confirm === 'yes') {
            await jet.sendExecuteAdminChange(provider.sender(), toNano('0.01'));
            console.log('✅ Scheduled admin change executed');
        } else {
            console.log('Canceled');
        }
    }

    await provider.waitForDeploy(jet.address);
}
