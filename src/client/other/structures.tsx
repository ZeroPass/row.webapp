import { WaPublicKey, WaSignature } from "../../common/Key";

interface IWebAuthnCreateResult {


    isValid: Valid,
    keyID ?: string,
    wa_pubkey ?: WaPublicKey
 }

export class WebAuthnCreateResult implements IWebAuthnCreateResult
{
    constructor (public isValid: Valid, public keyID: string, public wa_pubkey: WaPublicKey)
    {
        this.isValid = isValid;
        this.keyID = keyID;
        this.wa_pubkey = wa_pubkey;
    }

    getValidation(): boolean{
        return this.isValid.isValid;
    }
}


interface IWebAuthnApproveResult {
    isValid: Valid,
    signature ?: WaSignature
 }

export class WebAuthnApproveResult implements IWebAuthnApproveResult
{
    constructor (public isValid: Valid, public signature: WaSignature)
    {
        this.isValid = isValid;
        this.signature = signature;
    }

    getValidation(): boolean{
        return this.isValid.isValid;
    }
}


//validation
interface IValid{
     isValid: boolean;
     desc?: string;
 }

 export class Valid implements IValid
{
    constructor (public isValid: boolean, public desc: string)
    {
        this.isValid = isValid;
        this.desc = desc;
    }
}

interface IProposalStruct {
    proposal_name: string;
    data: Uint8Array;
}

export class ProposalStruct implements IProposalStruct
{
    constructor (public proposal_name: string, public data: Uint8Array)
    {
        this.proposal_name = proposal_name;
        this.data = data;
    }
}