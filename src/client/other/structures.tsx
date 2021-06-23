import { WaPublicKey, WaSignature } from "../../common/Key";

interface IWebAuthnCreateResult {


    isValid: Valid,
    keyID ?: string,
    key ?: WaPublicKey
 }

export class WebAuthnCreateResult implements IWebAuthnCreateResult
{
    constructor (public isValid: Valid, public keyID: string, public key: WaPublicKey)
    {
        this.isValid = isValid;
        this.keyID = keyID;
        this.key = key;
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

export class SerializedWaKey {
    pubkey: [string, string];
    user_presence: UserPresence;
    rpid: string;

    constructor (pubkey: [string, string], user_presence: UserPresence, rpid: string)
    {
        this.pubkey = pubkey;
        this.user_presence = user_presence;
        this.rpid = rpid;
    }
}

interface ISerializedAuthKey {
    key_name: string;
    wa_pubkey: SerializedWaKey;
    wait_sec: number;
    weight: number;
    keyid: string;
}

export class SerializedAuthKey implements ISerializedAuthKey
{
    constructor (public key_name: string, public wa_pubkey: SerializedWaKey, public wait_sec: number, public weight: number, public keyid: string)
    {
        this.key_name = key_name;
        this.wa_pubkey = wa_pubkey;
        this.wait_sec = wait_sec;
        this.weight = weight;
        this.keyid = keyid;
    }
}