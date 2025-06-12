import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';
import { encodeOffChainContent } from '../encodeOffchainContent';

export type CollectionConfig = {
    owner: string;
    content: string;
    royalty: number;
};

export function CollectionConfigToCell(config: CollectionConfig): Cell {
    const address = Address.parse(config.owner);

    // prettier-ignore
    return beginCell()
        .storeAddress(address) // lottery_address
        .storeAddress(address) // owner_address
        .storeUint(0, 64) // next_item_index
        .storeRef(
            beginCell()
            .storeRef(encodeOffChainContent(`${config.content}/collection.json`))
            .storeRef(beginCell().storeBuffer(Buffer.from(`${config.content}/`)).endCell())
            .endCell()
        )
        .storeRef(Cell.fromHex('b5ee9c7241020d010001d2000114ff00f4a413f4bcf2c80b01020162020c0202cd030b020120040a020120050902db0c8871c02497c0f83434c0c05c6c2497c0f83e903e900c7e800c5c75c87e800c7e800c3c00c12ce3850c1b088d148cb1c17cb865407e90350c0408fc013801b4c7f4cfe08417f30f45148c2ea3a24c840dd78c9004f6cf380c0d0d0d4d60840bf2c9a884aeb8c097c12103fcbc20060801f65135c705f2e191fa4021f001fa40d20031fa008209312d001ba121945315a0a1de22d70b01c300209206a19136e220c2fff2e192218e3e821005138d91c85009cf16500bcf16712449145446a0708010c8cb055007cf165005fa0215cb6a12cb1fcb3f226eb39458cf17019132e201c901fb00104794102a375be2070082028e3526f0018210d53276db103744006d71708010c8cb055007cf165005fa0215cb6a12cb1fcb3f226eb39458cf17019132e201c901fb0093303234e25502f00400727082108b77173505c8cbff5004cf1610248040708010c8cb055007cf165005fa0215cb6a12cb1fcb3f226eb39458cf17019132e201c901fb0000113e910c1c2ebcb85360003b5ed44d0d33ffa4020d749c2009a7f01fa40d43010241023e03070596d6d8001dd01e4659fac678b00e78b6664f6aa40009a11f9fe00766004805'))
        .storeRef(
            beginCell()
            .storeUint(config.royalty * 10, 16)
            .storeUint(1000, 16)
            .storeAddress(address) // Royalty recipient
            .endCell()
        )
        .endCell();
}

export class Collection implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Collection(address);
    }

    static createFromConfig(config: CollectionConfig, code: Cell, workchain = 0) {
        const data = CollectionConfigToCell(config);
        const init = { code, data };
        return new Collection(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
