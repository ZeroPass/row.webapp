export const enum UserPresence {
    none = 0,
    present = 1,
    verified = 2,
}

export const enum PublicKeyType {
    ecc = "ecc_public_key",
    rsa = "rsa_public_key"
}

abstract class IPublicKey {
    readonly type: PublicKeyType;
    asVariant() : Array<any> {
        return [this.type, this.__serialize_key()];
    }

    protected abstract __serialize_key(): any;
}

export class EccPublicKey extends IPublicKey {
    readonly type = PublicKeyType.ecc;
    key: string; // hex encoded ECC public key
    constructor(key: string) {
        super();
        this.key = key;
    }

    protected __serialize_key(): any {
        return this.key;
    }
}

export class RsaPublicKey extends IPublicKey {
    readonly type = PublicKeyType.rsa;
    modulus: string;
    exponent: string;
    constructor(modulus: string, exponent: string) {
        super();
        this.modulus = modulus;
        this.exponent = exponent;
    }

    protected __serialize_key(): any {
        return {"modulus": this.modulus, "exponent": this.exponent};
    }
}

export type PublicKey = EccPublicKey | RsaPublicKey;

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

    serialize(): any {
        return {
            "pubkey": this.pubkey.asVariant(),
            "user_presence": this.user_presence,
            "rpid": this.rpid
        }
    }
}

export function deserializeWaPublicKey(serKey: any) : WaPublicKey{
    var key;
    switch(serKey.pubkey[0]){
        case PublicKeyType.ecc:
            key = new EccPublicKey(serKey.pubkey[1]);
            break;
        case PublicKeyType.rsa:
            key = new RsaPublicKey(serKey.pubkey[1].modulus,serKey.pubkey[1].exponent);
            break;
        default:
            throw Error("Cannot deserialize WaPublicKey, unknown public key type");
    }
    return new WaPublicKey(key, serKey.user_presence, serKey.rpid)
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
