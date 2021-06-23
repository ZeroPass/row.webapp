export const enum UserPresence {
    none = 0,
    present = 1,
    verified = 2,
}

export const enum PublicKeyType {
    ecc = "ecc_public_key",
    rsa = "rsa_public_key"
}

export class RsaPublicKey {
    modulus: string;
    exponent: string;

    constructor (modulus: string, exponent: string)
    {
        this.modulus = modulus;
        this.exponent = exponent;
    }
}

export type EccPublicKey = string;
export type PublicKey = any[]; // variant [string - PublicKeyType, string - ecc public key | RsaPublicKey]

export class WaPublicKey {
    pubkey: PublicKey;
    user_presence: UserPresence;
    rpid: string;

    constructor (pubkey: PublicKey, user_presence: UserPresence, rpid: string)
    {
        this.pubkey = pubkey;
        this.user_presence = user_presence;
        this.rpid = rpid;
    }
}

export class WaKey {
    credentialId: string;
    wa_pubkey: WaPublicKey;

    constructor (credentialId: string, wa_pubkey: WaPublicKey)
    {
        this.credentialId = credentialId;
        this.wa_pubkey = wa_pubkey;
    }
}

export class AuthKey
{
    key_name: string;
    wa_pubkey: WaPublicKey;
    wait_sec: number;
    weight: number;
    keyid: string;

    constructor (key_name: string, wa_pubkey: WaPublicKey, wait_sec: number, weight: number, keyid: string)
    {
        this.key_name = key_name;
        this.wa_pubkey = wa_pubkey;
        this.wait_sec = wait_sec;
        this.weight = weight;
        this.keyid = keyid;
    }
}

export interface WaSignature {
    signature: string;
    auth_data: string;
    client_json: string
}
