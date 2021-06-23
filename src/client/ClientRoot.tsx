import {Serialize} from "eosjs";
import { ec } from 'elliptic';
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as IoClient from "socket.io-client";
import { AuthKey, PublicKeyType, WaKey, WaPublicKey } from "../common/Key";
import { Result } from "./connector/connector";
import * as Tabs from "./component/Tabs";
import * as Tab from "./component/Tab";
import DefaultScreen from "./screen/defaultScreen";
import AdvancedScreen from "./screen/advancedScreen";
import EncryptionDecode from "./cryptgraphy/encryption";
import ConnectorEOS from "./connector/connectorEos";

import {
  Valid,
  WebAuthnCreateResult,
  WebAuthnApproveResult
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
  public paramAccount: string = null;



  constructor() {
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

  public appendMessage(message: string) {
    console.log("Appended message: " + message);
    this.message += message + "\n";
    this.clientRoot.forceUpdate();
  }  

  }

function connectSocket(appState: AppState) {
  appState.io = IoClient(socketUrl);
  appState.io.on("reconnect", () => {
    appState.io.close();
    if (appState.alive) connectSocket(appState);
  });
  appState.io.on("err", (error: string) => {
    appState.appendMessage(error);
  });
  appState.io.on("keys", (keys: any) => {
    appState.setKeys(keys);
    appState.clientRoot.forceUpdate();
  });
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

    //send data to the 
    var result: Result = await new ConnectorEOS(appState).addKey(
      appState.accountID,
      appState.keyName,
      wacr.keyID,
      wacr.wa_pubkey
    );

    if (!result.isSucceeded)
      throw new Error(
        "registerDevice; Sending transaction to the server failed: " +
          result.desc
      );

    appState.appendMessage(
      "New key has been added to account " + appState.accountID + " on chain"
    );
  } catch (e) {
    //show in console
    console.log(e);
    //show on UIk
    appState.appendMessage(e);
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

    appState.appendMessage("Signing wa...");
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
    //var decode: EncryptionDecode = new EncryptionDecode();
    var key: WaKey = await new EncryptionDecode().decodeKey({
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
      key.wa_pubkey
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
  key: AuthKey,
  packedTransaction: Uint8Array,
  userId: Uint8Array = new Uint8Array(16)
): Promise<WebAuthnApproveResult> {
  try {
    if (!rpId) throw new Error("ApproveWA; rpId is undefined");

    if (!rpName) throw new Error("ApproveWA; rpName is undefined");

    if (!username) throw new Error("ApproveWA; username is undefined");

    if (!displayName) throw new Error("ApproveWA; displayName is undefined");

    if (!key) throw new Error("ApproveWA; key is undefined");

    if (!Array.isArray(key.wa_pubkey.pubkey) || key.wa_pubkey.pubkey.length !== 2 || typeof key.wa_pubkey.pubkey[0] !== 'string') {
        throw new Error('Invalid WA public key');
    }

    if (!packedTransaction)
      throw new Error("ApproveWA; packedTransaction is undefined");

    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();

    appState.appendMessage("Getting wa...");

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
    if (key.wa_pubkey.pubkey[0] == PublicKeyType.ecc)
    {
      const e = new ec('p256') as any;
      const pubKey = e.keyFromPublic(Serialize.hexToUint8Array(key.wa_pubkey.pubkey[1])).getPublic();

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
    else if (key.wa_pubkey.pubkey[0] == PublicKeyType.rsa) {
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

function createKeyArray(receivedKeys: Array<AuthKey>): Array<string> {
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

function getLastKey(receivedKeys: any[]): AuthKey {
    if (receivedKeys[0].length == 0)
      throw new Error(
        "No keys under current account. Please add key to your account to use current action: "
      );
    var lastElement = receivedKeys[0].keys.length - 1;
    var element = receivedKeys[0].keys[lastElement];
    return new AuthKey(element.key_name, element.wa_pubkey, element.wait_sec, element.weight, element.keyid);
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

    let seActions = await new ConnectorEOS(appState).serializeTransaction( TEMP_RAW_TRANSACTION );
    console.log(seActions[0].data);

    var TEMP_FIXED_TRANSACTION = {
      expiration: moment(timestamp).format("YYYY-MM-DDTHH:mm:ss"),
      ref_block_num: 0,
      ref_block_prefix: 0,
      max_net_usage_words: 0,
      max_cpu_usage_ms: 0,
      delay_sec: 0,
      context_free_actions: Array(),
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
      transaction_extensions: Array(),
    };

    console.log("Getting data from the chain");

    var keys = await new ConnectorEOS(appState).getTableRows(
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
    var result: Result = await new ConnectorEOS(appState).propose(
      appState.accountID,
      keyArray,
      TEMP_FIXED_TRANSACTION
    );

    if (!result.isSucceeded)
      throw new Error(
        "Propose; Sending transaction to the server failed: " + result.desc
      );

      appState.appendMessage(
      "New proposal with account " +
        appState.accountID +
        " has been added on chain"
    );
    return true;
  } catch (e) {
    //show in console
    console.log(e);
    //show on UI
    appState.appendMessage(e);
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
    const proposal = await new ConnectorEOS(appState).getProposal(appState.accountID, appState.accountID);
    const authKey  = await new ConnectorEOS(appState).getAuthKey(appState.accountID, appState.keyName);

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

    if (!waresult.getValidation())
      throw new Error(
        "testwasig; approveWA returned an error: " + waresult.isValid.desc
      );

    const result = await new ConnectorEOS(appState).approve(
      appState.accountID,
      appState.accountID,
      authKey.key_name,
      waresult.signature
    );
    const isSucceeded = String(result.isSucceeded);
    return result.isSucceeded;
  }
  catch(e) {
    //show in console
    console.log(e);
    //show on UIk
    appState.appendMessage(e);
    return false;
  }
}

export async function cancel(appState: AppState): Promise<boolean> {
  try {
    appState.appendMessage("Starting action: 'cancel'");
    if (!appState.accountID)
      throw new Error(
        'AccountID is not defined. Please fill the field "AccountID".'
      );

    const result = await new ConnectorEOS(appState).cancel(
      appState.accountID,
      appState.accountID,
    );
    return result.isSucceeded;
  }
  catch(e) {
    //show in console
    console.log(e);
    //show on UIk
    appState.appendMessage(e);
    return false;
  }
}

export async function testwasig(appState: AppState): Promise<boolean> {
  try {
    appState.appendMessage("Starting action: 'testwasig'");
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
      {key: wacr.wa_pubkey, keyid: wacr.keyID},
      testDataToSign
    );
    if (!waresult.getValidation())
      throw new Error(
        "testwasig; approveWA returned an error: " + waresult.isValid.desc
      );

    console.log(wacr.wa_pubkey.pubkey, waresult.signature);
    const result = await new ConnectorEOS(appState).testwasig(
        appState.accountID, 
        wacr.wa_pubkey,
        Serialize.arrayToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', testDataToSign))),
        waresult.signature);
    return result.isSucceeded;
  }
  catch(e) {
    console.log(e);
    appState.appendMessage(e);
    return false;
  }
}

export async function exec(appState: AppState): Promise<boolean> {
  try {
    if (!appState.accountID)
      throw new Error(
        'AccountID is not defined. Please fill the field "AccountID".'
      );

    const result = await new ConnectorEOS(appState).exec(appState.accountID, appState.accountID);
    return result.isSucceeded;
  }
  catch(e) {
    //show in console
    console.log(e);
    //show on UIk
    appState.appendMessage(e);
    return false;
  }
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
