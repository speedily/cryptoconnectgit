import { type Address, type LocalAccount } from "viem";
import type { Signer } from "../types/index.js";
export declare function toSigner({ signer, address }: {
    signer: Signer;
    address?: Address;
}): Promise<LocalAccount>;
//# sourceMappingURL=toSigner.d.ts.map