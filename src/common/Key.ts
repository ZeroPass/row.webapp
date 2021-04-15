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
    key: PublicKey;
    user_presence: UserPresence;
    rpid: string;

    constructor (key: PublicKey, user_presence: UserPresence, rpid: string)
    {
        this.key = key;
        this.user_presence = user_presence;
        this.rpid = rpid;
    }
}

export class WaKey {
    credentialId: string;
    key: WaPublicKey;

    constructor (credentialId: string, key: WaPublicKey)
    {
        this.credentialId = credentialId;
        this.key = key;
    }
}

export interface WaSignature {
    signature: string;
    auth_data: string;
    client_json: string
}
