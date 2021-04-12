import {Serialize} from "eosjs";
import { ec } from 'elliptic';
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as IoClient from "socket.io-client";
import { PublicKey, UserPresence, PublicKeyType, RsaPublicKey, WaKey, WaPublicKey } from "../common/Key";
import { Connector, Result } from "./connector/connector";
import { environment } from "./other/constant";
import * as Tabs from "./component/Tabs";
import * as Tab from "./component/Tab";
import DefaultScreen from "./screen/defaultScreen";
import AdvancedScreen from "./screen/advancedScreen";

import {
  Valid,
  WebAuthnCreateResult,
  WebAuthnApproveResult,
  KeyPair
} from "./other/structures";
const moment = require("moment");

//'use strict'
const cbor = require("cbor-web");
require("./screen/css/app.css");
require("./screen/css/normalize.css");
require("./screen/css/webflow.css");
require("./screen/css/row-6b2b63.webflow.css");

const socketUrl = "https://rowauthn.com:443";

export class AppState {
  public alive = true;
  public io: SocketIOClient.Socket;
  public clientRoot: ClientRoot;
  public keys = [] as WaKey[];
  public accountID: string = "";
  public keyName: string = "";
  //public proposalName: string = ""; //proposal will be the same as accountID

  public message = "";
  public balances = new Map<string, string>();
  public connector: Connector;
  public paramAccount: string = null;



  constructor() {
    this.connector = new Connector(environment.eosio.host);
    //get parameters from url
    this.getURLparams();
  }

  public getURLparams(){
    // find if there is url parameter (in our case: key = value) <url>?accountID
    var params = new URLSearchParams(document.location.search);
    if (params.keys())

    //if any value set it as account
    for(var key of params.keys()) {
      this.paramAccount  = key;
    }
    this.accountID = this.paramAccount;
  }

  public changeAccountID(accountID: string) {
    this.accountID = accountID;
  }

  public setKeyName(keyName: string) {
    this.keyName = keyName;
  }

  //public setProposalName(prososalName: string) {
  //  this.proposalName = prososalName;
  //}

  public restore(prev: AppState) {}

  public setKeys(keys: WaKey[]) {}
  }

function appendMessage(appState: AppState, message: string) {
  console.log("Appended message: " + message);
  appState.message += message + "\n";
  appState.clientRoot.forceUpdate();
}

function connectSocket(appState: AppState) {
  appState.io = IoClient(socketUrl);
  appState.io.on("reconnect", () => {
    appState.io.close();
    if (appState.alive) connectSocket(appState);
  });
  appState.io.on("err", (error: string) => {
    appendMessage(appState, error);
  });
  appState.io.on("keys", (keys: any) => {
    appState.setKeys(keys);
    appState.clientRoot.forceUpdate();
  });
}

interface AddKeyArgs {
  rpid: string;
  id: string;
  attestationObject: string;
  clientDataJSON: string;
}

const enum AttestationFlags {
  userPresent = 0x01,
  userVerified = 0x04,
  attestedCredentialPresent = 0x40,
  extensionDataPresent = 0x80,
}

function flagsToPresence(flags: number) {
  if (flags & AttestationFlags.userVerified) return UserPresence.verified;
  else if (flags & AttestationFlags.userPresent) return UserPresence.present;
  else return UserPresence.none;
}

async function decodeKey(k: AddKeyArgs): Promise<WaKey> {
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
    new WaPublicKey(key, flagsToPresence(flags), k.rpid)
  );
}

//Register device
export async function registerDevice(appState: AppState) {
  try {
    if (!appState.accountID)
      throw new Error(
        'AccountID is not defined. Please fill the field "AccountID".'
      );
    else if(appState.keyName.length == 0) {
      throw new Error(
        'Key name is not defined. Please fill the field "Key Name".'
      );
    }

    //get/define the data
    const rpId = window.location.hostname;
    const rpName = rpId;
    const username = appState.accountID; //'Mo.Lestor'
    const displayName = username + "@gmail.com";
    const challenge = new Uint8Array([
      0x8c,
      0x0a,
      0x26,
      0xff,
      0x22,
      0x91,
      0xc1,
      0xe9,
      0xb9,
      0x4e,
      0x2e,
      0x17,
      0x1a,
      0x98,
      0x6a,
      0x73,
      0x71,
      0x9d,
      0x43,
      0x48,
      0xd5,
      0xa7,
      0x6a,
      0x15,
      0x7e,
      0x38,
      0x94,
      0x52,
      0x77,
      0x97,
      0x0f,
      0xef,
    ]);

    console.log("Start webauthn process");
    var wacr: WebAuthnCreateResult = await registerWA(
      appState,
      rpId,
      rpName,
      username,
      displayName,
      challenge
    );

    console.log(`WebAuthnCreateResult ${wacr.getValidation()}`);
    if (!wacr.getValidation())
      throw new Error(
        "registerDevice; WebAuthn process throws an error: " + wacr.isValid.desc
      );

    //send data to the blockchain
    var result: Result = await blockchainAddKey(
      appState,
      appState.accountID,
      appState.keyName,
      wacr.keyID,
      wacr.key
    );

    if (!result.isSucceeded)
      throw new Error(
        "registerDevice; Sending transaction to the server failed: " +
          result.desc
      );

    appendMessage(
      appState,
      "New key has been added to account " + appState.accountID + " on chain"
    );
  } catch (e) {
    //show in console

    console.log(e);
    //show on UIk
    appendMessage(appState, e);
  }
}

async function registerWA(
  appState: AppState,
  rpId: string,
  rpName: string,
  username: string,
  displayName: string,
  challenge: Uint8Array,
  userId: Uint8Array = new Uint8Array(16)
): Promise<WebAuthnCreateResult> {
  try {
    if (!rpId) throw new Error("RegisterWA; rpId is undefined");

    if (!rpName) throw new Error("RegisterWA; rpName is undefined");

    if (!username) throw new Error("RegisterWA; username is undefined");

    if (!displayName) throw new Error("RegisterWA; displayName is undefined");

    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();

    appendMessage(appState, "Signing wa...");
    const rp = { id: rpId, name: rpName };
    const cred = await (navigator as any).credentials.create({
      publicKey: {
        rp,
        user: {
          id: userId,
          name: username,
          displayName: displayName,
        },
        pubKeyCredParams: [
          {
            type: "public-key",
            alg: -7,
          },
          {
            type: "public-key",
            alg: -257,
          },
        ],
        timeout: 60000,
        challenge: challenge
      },
    });
    var key: WaKey = await decodeKey({
      rpid: rp.id,
      id: Serialize.arrayToHex(new Uint8Array(cred.rawId)),
      attestationObject: Serialize.arrayToHex(
        new Uint8Array(cred.response.attestationObject)
      ),
      clientDataJSON: Serialize.arrayToHex(
        new Uint8Array(cred.response.clientDataJSON)
      ),
    });

    return new WebAuthnCreateResult(
      new Valid(true, "everything is fine"),
      key.credentialId,
      key.key
    );
  } catch (e) {
    return new WebAuthnCreateResult(
      new Valid(false, e),
      null,
      null
    );
  }
}

async function approveWA(
  appState: AppState,
  rpId: string,
  rpName: string,
  username: string,
  displayName: string,
  key: any,
  packedTransaction: Uint8Array,
  userId: Uint8Array = new Uint8Array(16)
): Promise<WebAuthnApproveResult> {
  try {
    if (!rpId) throw new Error("ApproveWA; rpId is undefined");

    if (!rpName) throw new Error("ApproveWA; rpName is undefined");

    if (!username) throw new Error("ApproveWA; username is undefined");

    if (!displayName) throw new Error("ApproveWA; displayName is undefined");

    if (!key) throw new Error("ApproveWA; key is undefined");

    if (!Array.isArray(key.key.key) || key.key.key.length !== 2 || typeof key.key.key[0] !== 'string') {
        throw new Error('Invalid WA public key');
    }

    if (!packedTransaction)
      throw new Error("ApproveWA; packedTransaction is undefined");

    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();

    appendMessage(appState, "Getting wa...");

    const signBuf = new Serialize.SerialBuffer();
    //signBuf.pushArray(Serialize.hexToUint8Array(chainId));
    signBuf.pushArray(packedTransaction);
    // if (serializedContextFreeData) {
    //     signBuf.pushArray(new Uint8Array(await crypto.subtle.digest('SHA-256', serializedContextFreeData.buffer)));
    // } else {
    //     signBuf.pushArray(new Uint8Array(32));
    // }
    const id        = Serialize.hexToUint8Array(key.keyid);
    const digest    = new Uint8Array(await crypto.subtle.digest('SHA-256', signBuf.asUint8Array().slice().buffer));
    const assertion = await (navigator as any).credentials.get({
        publicKey: {
            timeout: 60000,
            allowCredentials: [{
                id,
                type: 'public-key',
            }],
            challenge: digest.buffer,
        },
    });

    var signature: string;
    if (key.key.key[0] == PublicKeyType.ecc)
    {
      const e = new ec('p256') as any;
      const pubKey = e.keyFromPublic(Serialize.hexToUint8Array(key.key.key[1])).getPublic();

      const fixup = (x: Uint8Array) => {
          const a = Array.from(x);
          while (a.length < 32) {
              a.unshift(0);
          }
          while (a.length > 32) {
              if (a.shift() !== 0) {
                  throw new Error('Signature has an r or s that is too big');
              }
          }
          return new Uint8Array(a);
      };

      const der = new Serialize.SerialBuffer({ array: new Uint8Array(assertion.response.signature) });
      if (der.get() !== 0x30) {
          throw new Error('Signature missing DER prefix');
      }
      if (der.get() !== der.array.length - 2) {
          throw new Error('Signature has bad length');
      }
      if (der.get() !== 0x02) {
          throw new Error('Signature has bad r marker');
      }
      const r = fixup(der.getUint8Array(der.get()));
      if (der.get() !== 0x02) {
          throw new Error('Signature has bad s marker');
      }
      const s = fixup(der.getUint8Array(der.get()));

      const whatItReallySigned = new Serialize.SerialBuffer();
      whatItReallySigned.pushArray(new Uint8Array(assertion.response.authenticatorData));
      whatItReallySigned.pushArray(new Uint8Array(
          await crypto.subtle.digest('SHA-256', assertion.response.clientDataJSON)));
      const hash = new Uint8Array(
          await crypto.subtle.digest('SHA-256', whatItReallySigned.asUint8Array().slice()));
      const recid = e.getKeyRecoveryParam(hash, new Uint8Array(assertion.response.signature), pubKey);

      const sigData = new Serialize.SerialBuffer();
      sigData.push(recid + 27 + 4);
      sigData.pushArray(r);
      sigData.pushArray(s);
      signature = Serialize.arrayToHex(sigData.asUint8Array());
    }
    else if (key.key.key[0] == PublicKeyType.rsa) {
      signature = Serialize.arrayToHex(new Uint8Array(assertion.response.signature));
    }
    else {
      throw Error("Unsupported DSA algorithm");
    }

    const sig = {
      signature: signature,
      auth_data: Serialize.arrayToHex(new Uint8Array(assertion.response.authenticatorData)),
      client_json: String.fromCharCode.apply(null, new Uint8Array(assertion.response.clientDataJSON))
    };

    //signatures.push(sig);
    return new WebAuthnApproveResult(
      new Valid(true, "everything is fine"),
      sig
    );
  } catch (e) {
    return new WebAuthnApproveResult(
      new Valid(false, e),
      null
    );
  }
}
function createLinkOnBlockExplorer(transactionID: string): string{
  //block explorer
  var BLOCK_EXPLORER = "https://local.bloks.io/account/eosio?nodeUrl=https%3A%2F%2F163.172.144.187%3A9899";
  return BLOCK_EXPLORER + "/transaction/" + transactionID;
}

async function blockchainAddKey(
  appState: AppState,
  accountID: string,
  keyName: string,
  keyID: string,
  pubKey: WaPublicKey,
  weight: number = 1,
  wait_sec: number = 0
): Promise<Result> {
  if (!keyName) throw new Error("blockchainAddKey; 'keyName' is not defined");

  if (!keyID) throw new Error("blockchainAddKey; 'KeyID' is not defined");

  if (!pubKey) throw new Error("blockchainAddKey; 'Key' is not defined");

  if (weight < 1) throw new Error("blockchainAddKey; 'Key' invalid key weight");

  if (wait_sec < 0) throw new Error("blockchainAddKey; 'Key' invalid key wait_sec");

  const alphabet = ".12345abcdefghijklmnopqrstuvwxyz";
  var KEY_STRUCT = {
    key_name: keyName,
    key: pubKey,
    wait_sec: wait_sec,
    weight: weight,
    keyid: keyID,
  };
  const result = await appState.connector.addKey(accountID, KEY_STRUCT);
  const isSucceeded = String(result.isSucceeded);
  appendMessage(
    appState,
    `Is transaction succeeded: ${isSucceeded}, description: ${createLinkOnBlockExplorer(result.desc)}`
  );
  return result;
}

async function blockchainPropose(
  appState: AppState,
  accountID: string,
  requested_approvals: string[],
  trx: {}
): Promise<Result> {
  if (!accountID)
    throw new Error("blockchainPropose; 'AccountID' is not defined");
  if (!requested_approvals || requested_approvals.length == 0)
    throw new Error("blockchainPropose; 'requested_approvals' is not defined");
  if (!trx) throw new Error("blockchainPropose; 'trx' is not defined");
  //if (!appState.proposalName)
  //throw new Error("blockchainPropose; 'proposalName' is not defined");

  const result = await appState.connector.propose(
    accountID,
    accountID,
    requested_approvals,
    trx
  );
  const isSucceeded = String(result.isSucceeded);
  appendMessage(
    appState,
    `Is transaction succeeded: ${isSucceeded}, description: ${result.desc}`
  );
  return result;
}

function createKeyArray(receivedKeys: any[]): Array<string> {
  if (receivedKeys.length == 0)
    throw new Error(
      "No keys under current account. Please add key to your account to use current action: "
    );

  var keyArray: string[] = new Array<string>();
  for (var item of receivedKeys) {
    keyArray.push(item.key_name);
  }
  return keyArray;
}

function getLastKey(receivedKeys: any[]): KeyPair {
    if (receivedKeys[0].length == 0)
      throw new Error(
        "No keys under current account. Please add key to your account to use current action: "
      );
    var lastElement = receivedKeys[0].keys.length - 1;
    var element = receivedKeys[0].keys[lastElement];
    return new KeyPair(element.key_name, element.key, element.wait_sec, element.weight, element.keyid);
  }


export async function propose(appState: AppState): Promise<boolean> {
  try {
    if (!appState.accountID)
      throw new Error(
        'AccountID is not defined. Please fill the field "AccountID".'
      );
    //if (!appState.proposalName) {
    //  throw new Error(
    //    'prososalName is not defined. Please fill the field "Proposal Name".'
    //  );
    //}

    const username = appState.accountID; //'Mo.Lestor'

    //get timestamp; minutes
    var timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes() + 5);

    var TEMP_RAW_TRANSACTION  = [
      {
        account: "eosio.token",
        name: "transfer",
        authorization: [
          {
            actor: username,
            permission: 'active',
          }
        ], data: {
          from: username,
          to: "rowuseruser2",
          quantity:"4.2000 EOS",
          memo:"Transfer by ROW"
      },
      }
    ];

    let seActions = await appState.connector.serializeTransaction( TEMP_RAW_TRANSACTION );
    console.log(seActions[0].data);

    var TEMP_FIXED_TRANSACTION = {
      expiration: moment(timestamp).format("YYYY-MM-DDTHH:mm:ss"),
      ref_block_num: 0,
      ref_block_prefix: 0,
      max_net_usage_words: 0,
      max_cpu_usage_ms: 0,
      delay_sec: 0,
      context_free_actions: false,
      actions: [
        {
          account: "eosio.token",
          name: "transfer",
          authorization: [
            {
              actor: username,
              permission: "active",
            },
          ],
          data: seActions[0].data
        },
      ],
      transaction_extensions: false,
    };

    console.log("Getting data from the chain");

    var keys = await appState.connector.getTableRows(
      environment.eosio.contract,
      appState.accountID,
      "authorities"
    );

    if (!keys.isSucceeded)
      throw new Error(
        "Getting data from the chain failed with error: " + keys.desc
      );

    if (keys.desc.length == 0)
      throw new Error(
        "No keys on chain under current account. Please add key and then make new process"
      );

    var keyArray = createKeyArray(keys.desc[0].keys);
    if (keyArray.length == 0)
      throw new Error(
        "No keys on chain under current account. Please add key and then make new process"
      );

    //send data to the blockchain
    var result: Result = await blockchainPropose(
      appState,
      appState.accountID,
      keyArray,
      TEMP_FIXED_TRANSACTION
    );

    if (!result.isSucceeded)
      throw new Error(
        "Propose; Sending transaction to the server failed: " + result.desc
      );

    appendMessage(
      appState,
      "New proposal with account " +
        appState.accountID +
        " has been added on chain"
    );
    return true;
  } catch (e) {
    //show in console
    console.log(e);
    //show on UI
    appendMessage(appState, e);
    return false;
  }
}

export async function approve(appState: AppState): Promise<boolean> {
  try {
    if (!appState.accountID)
      throw new Error(
        'AccountID is not defined. Please fill the field "AccountID".'
      );
    //else if (!appState.proposalName || appState.proposalName.length == 0) {
    //  throw new Error(
    //    'proposalName is not defined. Please fill the field "Proposal".'
    //  );
    //}
    else if (!appState.keyName || appState.keyName.length == 0) {
      throw new Error(
        'keyName is not defined. Please fill the field "Key Name".'
      );
    }

    console.log("Getting data from the chain");
    const proposal = await appState.connector.getProposal(appState.accountID, appState.accountID);
    const authKey  = await appState.connector.getAuthKey(appState.accountID, appState.keyName);

    //get/define the data
    const rpId = window.location.hostname;
    const rpName = rpId;
    const username = appState.accountID; //'Mo.Lestor'
    const displayName = username + "@gmail.com";
    //const credentialID = lastKey.keyid;

    console.log("Start webauthn process");
    var waresult: WebAuthnApproveResult = await approveWA(
      appState,
      rpId,
      rpName,
      username,
      displayName,
      authKey,
      Serialize.hexToUint8Array(proposal.packed_transaction)
    );

    const result = await appState.connector.approve(
      appState.accountID,
      appState.accountID,
      authKey.key_name,
      waresult.signature
    );
    const isSucceeded = String(result.isSucceeded);
    appendMessage(
      appState,
      `Is transaction succeeded: ${isSucceeded}, description: ${createLinkOnBlockExplorer(result.desc)}`
    );
    return true;
  }
  catch(e) {
    //show in console
    console.log(e);
    //show on UIk
    appendMessage(appState, e);
    return false;
  }
}

export async function cancel(appState: AppState): Promise<boolean> {
  try {
    appendMessage(appState, "Starting action: 'cancel'");
    if (!appState.accountID)
      throw new Error(
        'AccountID is not defined. Please fill the field "AccountID".'
      );
    //else if (!appState.proposalName || appState.proposalName.length == 0) {
    //  throw new Error(
    //    'proposalName is not defined. Please fill the field "Proposal".'
    //  );
    //}

    const result = await appState.connector.cancel(
      appState.accountID,
      appState.accountID,
    );
    const isSucceeded = String(result.isSucceeded);
    appendMessage(
      appState,
      `Is transaction succeeded: ${isSucceeded}, description: ${result.desc}`
    );
    return true;
  }
  catch(e) {
    //show in console
    console.log(e);
    //show on UIk
    appendMessage(appState, e);
    return false;
  }
}

export async function testwasig(appState: AppState): Promise<boolean> {
  try {
    appendMessage(appState, "Starting action: 'testwasig'");
    if (!appState.accountID)
      throw new Error(
        'AccountID is not defined. Please fill the field "AccountID".'
      );

      const rpId = window.location.hostname;
    const rpName = rpId;
    const username = appState.accountID; //'Mo.Lestor'
    const displayName = username + "@gmail.com";
    const challenge = new Uint8Array([
      0x8c,
      0x0a,
      0x26,
      0xff,
      0x22,
      0x91,
      0xc1,
      0xe9,
      0xb9,
      0x4e,
      0x2e,
      0x17,
      0x1a,
      0x98,
      0x6a,
      0x73,
      0x71,
      0x9d,
      0x43,
      0x48,
      0xd5,
      0xa7,
      0x6a,
      0x15,
      0x7e,
      0x38,
      0x94,
      0x52,
      0x77,
      0x97,
      0x0f,
      0xef,
    ]);

    console.log("Start webauthn process");
    var wacr: WebAuthnCreateResult = await registerWA(
      appState,
      rpId,
      rpName,
      username,
      displayName,
      challenge
    );

    console.log(`WebAuthnCreateResult ${wacr.getValidation()}`);
    if (!wacr.getValidation())
      throw new Error(
        "testwasig; registerWA returned an error: " + wacr.isValid.desc
      );

    const testDataToSign = new Uint8Array([0x8c]);
    var waresult: WebAuthnApproveResult = await approveWA(
      appState,
      rpId,
      rpName,
      username,
      displayName,
      {key: wacr.key, keyid: wacr.keyID},
      testDataToSign
    );
    if (!waresult.getValidation())
      throw new Error(
        "testwasig; approveWA returned an error: " + waresult.isValid.desc
      );

    console.log(wacr.key.key, waresult.signature);
    const result = await appState.connector.api.transact(
    {
        actions: [{
            account: environment.eosio.contract,
            name: 'testwasig',
            data: {
              pubkey: wacr.key,
              signed_hash: Serialize.arrayToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', testDataToSign))),
              sig: waresult.signature,
            },
            authorization: [{
                actor: username,
                permission: 'active', //'wamsig'
            }],
        }],
    }, {
        blocksBehind: 3,
        expireSeconds: 30,
    });
    console.log(result);
    appendMessage(
        appState,
        `Is transaction succeeded: True, description: ${result.transaction_id}`
    );

    return true;
  }
  catch(e) {
    console.log(e);
    appendMessage(appState, e);
    return false;
  }
}

export async function exec(appState: AppState): Promise<boolean> {
  try {
    if (!appState.accountID)
      throw new Error(
        'AccountID is not defined. Please fill the field "AccountID".'
      );
    //else if (!appState.proposalName || appState.proposalName.length == 0) {
    //  throw new Error(
    //    'proposalName is not defined. Please fill the field "Proposal".'
    //  );
    //}

    const result = await appState.connector.api.transact(
    {
        actions: [{
            account: environment.eosio.contract,
            name: 'exec',
            data: {
                account: appState.accountID,
                proposal_name: appState.accountID,
            },
            authorization: [{
                actor: appState.accountID,
                permission: 'active', //'wamsig'
            }],
        }],
    }, {
        blocksBehind: 3,
        expireSeconds: 30,
    });
    console.log(result);
    //return new Result(true, result.transaction_id);
    const isSucceeded = String(result.isSucceeded);
    appendMessage(
      appState,
      `Proposed transaction has been executed:  ${createLinkOnBlockExplorer(result.transaction_id)}`
    );
    return true;
  }
  catch(e) {
    //show in console
    console.log(e);
    //show on UIk
    appendMessage(appState, e);
    return false;
  }
}

async function getTable(appState: AppState) {
  const TEMP_FIXED_USER: string = appState.accountID;

  const result = await appState.connector.getTableRows(
    "eosio.token",
    TEMP_FIXED_USER,
    "accounts"
  );
  if (Array.isArray(result)) appendMessage(appState, result.toString());
  else appendMessage(appState, result.desc);
}


class ClientRoot extends React.Component<{ appState: AppState }> {
  public render() {
    const { appState } = this.props;
    appState.clientRoot = this;
    return (

        <Tabs.default>
        <Tab.default label="Home">
          <DefaultScreen appState={appState}/>

        </Tab.default>
        <Tab.default label="Advanced">
          <AdvancedScreen appState={appState}/>
        </Tab.default>
      </Tabs.default>
    );
  }
}

export default function init(prev: AppState) {
  const appState = new AppState();
  if (prev) {
    appState.restore(prev);
    prev.alive = false;
    if (prev.io) prev.io.close();
  }
  connectSocket(appState);
  ReactDOM.render(
    <ClientRoot {...{ appState }} />,
    document.getElementById("main")
  );
  return appState;
}
