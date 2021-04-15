import {  PublicKey, UserPresence, PublicKeyType, RsaPublicKey, WaKey, WaPublicKey } from "../../common/Key";
import { Serialize } from "eosjs";
const cbor = require("cbor-web");


interface AddKeyArgs {
    rpid: string;
    id: string;
    attestationObject: string;
    clientDataJSON: string;
  }

enum AttestationFlags {
    userPresent = 0x01,
    userVerified = 0x04,
    attestedCredentialPresent = 0x40,
    extensionDataPresent = 0x80,
    }

export default class EncryptionDecode  {
    
    public flagsToPresence(flags: number) {
        if (flags & AttestationFlags.userVerified) return UserPresence.verified;
        else if (flags & AttestationFlags.userPresent) return UserPresence.present;
        else return UserPresence.none;
    }

    public async decodeKey(k: AddKeyArgs): Promise<WaKey> {
        // todo: check RP ID hash
        // todo: check signature
        let unloadedModule = false;
        if (unloadedModule) return;
        //console.log(k);
        // console.log(JSON.stringify(JSON.parse(textDecoder.decode(Serialize.hexToUint8Array(k.clientDataJSON))), null, 4));
        const att = await (cbor as any).decodeFirst(
          Serialize.hexToUint8Array(k.attestationObject)
        );
        //console.log(att);
        //console.log(Serialize.arrayToHex(new Uint8Array(att.authData.buffer)));
        const data = new DataView(att.authData.buffer, att.authData.byteOffset, att.authData.length);
        let pos = 0;//30; // skip unknown
        pos += 32; // RP ID hash
        const flags = data.getUint8(pos++);
        const signCount = data.getUint32(pos);
        pos += 4;
        if (!(flags & AttestationFlags.attestedCredentialPresent))
          throw new Error("attestedCredentialPresent flag not set");
        const aaguid = Serialize.arrayToHex(new Uint8Array(data.buffer, data.byteOffset + pos, 16));
        pos += 16;
        const credentialIdLength = data.getUint16(pos);
        pos += 2;
        const credentialId = new Uint8Array(data.buffer, data.byteOffset + pos, credentialIdLength);
        pos += credentialIdLength;
        if (Serialize.arrayToHex(credentialId) !== k.id)
          throw new Error("Credential ID does not match");
      
        const pubKey = await (cbor as any).decodeFirst(
          new Uint8Array(data.buffer, data.byteOffset + pos)
        );
      
        var keyType = pubKey.get(1);
        if (keyType !== 2 && keyType !== 3) throw new Error("Public key is not EC2 or RSA");
        if (pubKey.get(3) !== -7 && pubKey.get(3) !== -257) throw new Error("Public key is not ES256 or RS256");
      
        var key : PublicKey;
        if (keyType == 2) {//ES256
          if (pubKey.get(-1) !== 1) throw new Error("Public key has unsupported curve");
          const x = pubKey.get(-2);
          const y = pubKey.get(-3);
          if (x.length !== 32 || y.length !== 32)
            throw new Error("Public key has invalid X or Y size");
      
          const serKey = new Serialize.SerialBuffer({
            textEncoder: new TextEncoder(),
            textDecoder: new TextDecoder(),
          });
      
          // ECC
          serKey.push(y[31] & 1 ? 3 : 2);
          serKey.pushArray(x);
          key = [PublicKeyType.ecc, Serialize.arrayToHex(serKey.asUint8Array())]
        }
        else { // RS256
          var mod = Serialize.arrayToHex(pubKey.get(-1));
          var exp = Serialize.arrayToHex(pubKey.get(-2));
          key = [PublicKeyType.rsa, new RsaPublicKey(mod, exp)]
        }
      
        return new WaKey(
          Serialize.arrayToHex(credentialId),
          new WaPublicKey(key, this.flagsToPresence(flags), k.rpid)
        );
      }


}