interface IWebAuthnCreateResult { 
    

    isValid: Valid, 
    keyID ?: string,
    key ?: string
 }

export class WebAuthnCreateResult implements IWebAuthnCreateResult 
{
    constructor (public isValid: Valid, public keyID: string, public key: string) 
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
    signedData ?: string
 }

export class WebAuthnApproveResult implements IWebAuthnApproveResult 
{
    constructor (public isValid: Valid, public signedData: string) 
    {
        this.isValid = isValid;
        this.signedData = signedData;
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
    data: string;
}

export class ProposalStruct implements IProposalStruct 
{
    constructor (public proposal_name: string, public data: string) 
    {
        this.proposal_name = proposal_name;
        this.data = data;
    }
}


interface IKeyPair {
    key_name: string;
    key: string;
    wait_sec: number;
    weight: number;
    keyid: string;
}

export class KeyPair implements IKeyPair 
{
    constructor (public key_name: string, public key: string, public wait_sec: number, public weight: number, public keyid: string) 
    {
        this.key_name = key_name;
        this.key = key;
        this.wait_sec = wait_sec;
        this.weight = weight;
        this.keyid = keyid;
    }
}