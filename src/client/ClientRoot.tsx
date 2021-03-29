import { Api, JsonRpc, Serialize, Numeric} from 'eosjs';
import { watch } from 'fs';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as IoClient from 'socket.io-client';
import { Key } from '../common/Key';
import { Connector, Result } from './connector';
import {environment} from './constant';
import {Valid, WebAuthnCreateResult} from './structures';
const moment = require('moment');
require('fast-text-encoding');  
const { nanoid } = require('nanoid');


//'use strict'
const cbor = require('cbor-web');

require('./style.css');

const socketUrl = 'https://ubi.world:8000';

class AppState {
    public alive = true;
    public io: SocketIOClient.Socket;
    public clientRoot: ClientRoot;
    public keys = [] as Key[];
    public accountID: string = "rowuseruser1";
    //public sigprov = new WaSignatureProvider();
    //public rpc = new JsonRpc('http://localhost:8888');
    //public api: Api;
    public message = '';
    public balances = new Map<string, string>();

    public connector : Connector;

    constructor() {
        this.connector = new Connector(environment.eosio.host);
        /*this.api = new Api({ rpc: this.rpc, signatureProvider: this.sigprov });
        this.updateBalance('usera');
        this.updateBalance('userb');
        this.updateBalance('userc');
        this.updateBalance('userd');*/
    }

    public changeAccountID(accountID: string){
        this.accountID = accountID;
    }

    public restore(prev: AppState) {
        /*
        this.message = prev.message;
        this.setKeys(prev.keys);*/
    }

    public setKeys(keys: Key[]) {
        /*this.keys = keys;
        this.sigprov.keys.clear();
        for (const key of this.keys)
            this.sigprov.keys.set(key.key, key.credentialId);*/
    }

    private async updateBalance(name: string) {
        /*while (this.alive) {
            try {
                await delay(200);
                this.balances.set(name, (await this.rpc.get_currency_balance('eosio.token', name))[0]);
                if (this.clientRoot)
                    this.clientRoot.forceUpdate();
            } catch (e) {
                console.log(e);
            }
        }*/
    }
}

function appendMessage(appState: AppState, message: string) {
    console.log('Appended message: ' + message);
    appState.message += message + '\n';
    appState.clientRoot.forceUpdate();
}

function connectSocket(appState: AppState) {
    appState.io = IoClient(socketUrl);
    appState.io.on('reconnect', () => {
        appState.io.close();
        if (appState.alive)
            connectSocket(appState);
    });
    appState.io.on('err', (error: string) => {
        appendMessage(appState, error);
    });
    appState.io.on('keys', (keys: any) => {
        appState.setKeys(keys);
        appState.clientRoot.forceUpdate();
    });
}

async function delay(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}

//////

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

const enum UserPresence {
    none = 0,
    present = 1,
    verified = 2,
}

function flagsToPresence(flags: number) {
    if (flags & AttestationFlags.userVerified)
        return UserPresence.verified;
    else if (flags & AttestationFlags.userPresent)
        return UserPresence.present;
    else
        return UserPresence.none;
}

async function decodeKey1(k: AddKeyArgs): Promise<Key> {
// todo: check RP ID hash
    // todo: check signature
    let unloadedModule = false;
    if (unloadedModule)
        return;
    //console.log(k);
    // console.log(JSON.stringify(JSON.parse(textDecoder.decode(Serialize.hexToUint8Array(k.clientDataJSON))), null, 4));
    //const att = await cbor.decodeFirst(Serialize.hexToUint8Array(k.attestationObject));
}


async function decodeKey(k: AddKeyArgs): Promise<Key> {
    // todo: check RP ID hash
    // todo: check signature
    let unloadedModule = false;
    if (unloadedModule)
        return;
    //console.log(k);
    // console.log(JSON.stringify(JSON.parse(textDecoder.decode(Serialize.hexToUint8Array(k.clientDataJSON))), null, 4));
    const att = await (cbor as any).decodeFirst(Serialize.hexToUint8Array(k.attestationObject));
    //console.log(att);
    //console.log(Serialize.arrayToHex(new Uint8Array(att.authData.buffer)));
    const data = new DataView(att.authData.buffer);
    let pos = 30;   // skip unknown
    pos += 32;      // RP ID hash
    const flags = data.getUint8(pos++);
    const signCount = data.getUint32(pos);
    pos += 4;
    if (!(flags & AttestationFlags.attestedCredentialPresent))
        throw new Error('attestedCredentialPresent flag not set');
    const aaguid = Serialize.arrayToHex(new Uint8Array(data.buffer, pos, 16));
    pos += 16;
    const credentialIdLength = data.getUint16(pos);
    pos += 2;
    const credentialId = new Uint8Array(data.buffer, pos, credentialIdLength);
    pos += credentialIdLength;
    var yew =  await (cbor as any).decodeFirst(new Uint8Array(data.buffer, pos));
    const pubKey = await (cbor as any).decodeFirst(new Uint8Array(data.buffer, pos));
    if (Serialize.arrayToHex(credentialId) !== k.id)
        throw new Error('Credential ID does not match');
    if (pubKey.get(1) !== 2)
        throw new Error('Public key is not EC2');
    if (pubKey.get(3) !== -7)
        throw new Error('Public key is not ES256');
    if (pubKey.get(-1) !== 1)
        throw new Error('Public key has unsupported curve');
    const x = pubKey.get(-2);
    const y = pubKey.get(-3);
    if (x.length !== 32 || y.length !== 32)
        throw new Error('Public key has invalid X or Y size');
        
    const ser = new Serialize.SerialBuffer({textEncoder:  new TextEncoder(), textDecoder: new TextDecoder()});
    ser.push((y[31] & 1) ? 3 : 2);
    ser.pushArray(x);
    ser.push(flagsToPresence(flags));
    ser.pushString(k.rpid);
    const compact = ser.asUint8Array();
    const key = Numeric.publicKeyToString({
        type: Numeric.KeyType.wa,
        data: compact,
    });
    console.log({
        flags: ('00' + flags.toString(16)).slice(-2),
        signCount,
        aaguid,
        credentialIdLength,
        credentialId: Serialize.arrayToHex(credentialId),
        rpid: k.rpid,
        presence: flagsToPresence(flags),
        x: Serialize.arrayToHex(x),
        y: Serialize.arrayToHex(y),
        compact: Serialize.arrayToHex(compact),
        key,
    });
    return {
        credentialId: Serialize.arrayToHex(credentialId),
        key,
    };
}

/////

function popUp(text:string){

}

//Register device

async function registerDevice(appState: AppState){
    try{
        if (!appState.accountID)
            throw new Error('AccountID is not defined. Please fill the field "AccountID".');

        //get/define the data
        const rpId = 'ubi.world';
        const rpName = rpId;
        const username = appState.accountID; //'Mo.Lestor'
        const displayName = username + "@gmail.com";
        const challenge = new Uint8Array([
            0x8C, 0x0A, 0x26, 0xFF, 0x22, 0x91, 0xC1, 0xE9, 0xB9, 0x4E, 0x2E, 0x17, 0x1A, 0x98, 0x6A, 0x73,
            0x71, 0x9D, 0x43, 0x48, 0xD5, 0xA7, 0x6A, 0x15, 0x7E, 0x38, 0x94, 0x52, 0x77, 0x97, 0x0F, 0xEF,
        ]);

        console.log("Start webauthn process");
        var wacr: WebAuthnCreateResult  = await registerWA(appState, rpId, rpName, username, displayName, challenge);

        console.log(`WebAuthnCreateResult ${wacr.getValidation()}`);
        if (!wacr.getValidation())
            throw new Error('registerDevice; WebAuthn process throws an error: ' + wacr.isValid.desc);

        //send data to the blockchain
        var result: Result = await blockchainAddKey(appState, appState.accountID, wacr.keyID, wacr.key);
        
        if (!result.isSucceeded)
            throw new Error('registerDevice; Sending transaction to the server failed: ' + result.desc);

        appendMessage(appState, "New key has been added to account " + appState.accountID + " on chain");
    } catch (e) {
        //show in console

        console.log(e);
        //show on UIk
        appendMessage(appState, e);
    }
}


async function registerWA(appState: AppState, rpId:string, rpName:string, username: string, displayName: string, challenge: Uint8Array, userId: Uint8Array = new Uint8Array(16) ):
Promise<WebAuthnCreateResult>{
    try {
        if(!rpId)
            throw new Error('RegisterWA; rpId is undefined');
        
        if(!rpName)
            throw new Error('RegisterWA; rpName is undefined');

        if(!username)
            throw new Error('RegisterWA; username is undefined');

        if(!displayName)
            throw new Error('RegisterWA; displayName is undefined');

        const textEncoder = new TextEncoder();
        const textDecoder = new TextDecoder();

        appendMessage(appState, 'Signing wa...');
        const rp = { id: rpId, name: rpName };
        const cred = await (navigator as any).credentials.create({
            publicKey: {
                rp,
                user: {
                    id: userId,
                    name: username,
                    displayName: displayName,
                },
                pubKeyCredParams: [{
                    type: 'public-key',
                    alg: -7,
                }],
                timeout: 60000,
                challenge: challenge
                /*new Uint8Array([
                    0x8C, 0x0A, 0x26, 0xFF, 0x22, 0x91, 0xC1, 0xE9, 0xB9, 0x4E, 0x2E, 0x17, 0x1A, 0x98, 0x6A, 0x73,
                    0x71, 0x9D, 0x43, 0x48, 0xD5, 0xA7, 0x6A, 0x15, 0x7E, 0x38, 0x94, 0x52, 0x77, 0x97, 0x0F, 0xEF,
                ]).buffer*/,
            },
        });
        var key: Key = await decodeKey({
            rpid: rp.id,
            id: Serialize.arrayToHex(new Uint8Array(cred.rawId)),
            attestationObject: Serialize.arrayToHex(new Uint8Array(cred.response.attestationObject)),
            clientDataJSON: Serialize.arrayToHex(new Uint8Array(cred.response.clientDataJSON)),
        });

        return new WebAuthnCreateResult(new Valid(true, "everything is fine"),  key.credentialId, key.key);
    } catch (e) {
        appendMessage(appState, e);
    }
}


async function proposeWA(appState: AppState, rpId:string, rpName:string, username: string, displayName: string, id: string, challenge: Uint8Array, userId: Uint8Array = new Uint8Array(16) ):
Promise<WebAuthnCreateResult>{
    try {
        if(!rpId)
            throw new Error('RegisterWA; rpId is undefined');
        
        if(!rpName)
            throw new Error('RegisterWA; rpName is undefined');

        if(!username)
            throw new Error('RegisterWA; username is undefined');

        if(!displayName)
            throw new Error('RegisterWA; displayName is undefined');

        const textEncoder = new TextEncoder();
        const textDecoder = new TextDecoder();

        appendMessage(appState, 'Signing wa...');
        const rp = { id: rpId, name: rpName };
        const cred = await (navigator as any).credentials.get({
            publicKey: {
                rp, //needed
                user: {
                    id: userId,
                    name: username,
                    displayName: displayName,
                },
                userVerification: undefined,
                extensions: {},
                allowCredentials: [{
                    type: 'public-key',
                    id: id,
                }],
                timeout: 60000, //needed
                challenge: challenge //needed
            },
        });
        var key: Key = await decodeKey({
            rpid: rp.id,
            id: Serialize.arrayToHex(new Uint8Array(cred.rawId)),
            attestationObject: Serialize.arrayToHex(new Uint8Array(cred.response.attestationObject)),
            clientDataJSON: Serialize.arrayToHex(new Uint8Array(cred.response.clientDataJSON)),
        });

        return new WebAuthnCreateResult(new Valid(true, "everything is fine"),  key.credentialId, key.key);
    } catch (e) {
        appendMessage(appState, e);
    }
}

async function createKey(appState: AppState) {
    try {

        const textEncoder = new TextEncoder();
        const textDecoder = new TextDecoder();

        appendMessage(appState, 'Create key...');
        const rp = { id: 'ubi.world', name: 'ubi.world' };
        const cred = await (navigator as any).credentials.create({
            publicKey: {
                rp,
                user: {
                    id: new Uint8Array(16),
                    name: 'john.p.smith@example.com',
                    displayName: 'John P. Smith',
                },
                pubKeyCredParams: [{
                    type: 'public-key',
                    alg: -7,
                }],
                timeout: 60000,
                challenge: new Uint8Array([
                    0x8C, 0x0A, 0x26, 0xFF, 0x22, 0x91, 0xC1, 0xE9, 0xB9, 0x4E, 0x2E, 0x17, 0x1A, 0x98, 0x6A, 0x73,
                    0x71, 0x9D, 0x43, 0x48, 0xD5, 0xA7, 0x6A, 0x15, 0x7E, 0x38, 0x94, 0x52, 0x77, 0x97, 0x0F, 0xEF,
                ]).buffer,
            },
        });
        decodeKey({
            rpid: rp.id,
            id: Serialize.arrayToHex(new Uint8Array(cred.rawId)),
            attestationObject: Serialize.arrayToHex(new Uint8Array(cred.response.attestationObject)),
            clientDataJSON: Serialize.arrayToHex(new Uint8Array(cred.response.clientDataJSON)),
        });

        /*appState.io.emit('addKey', {
            rpid: rp.id,
            id: Serialize.arrayToHex(new Uint8Array(cred.rawId)),
            attestationObject: Serialize.arrayToHex(new Uint8Array(cred.response.attestationObject)),
            clientDataJSON: Serialize.arrayToHex(new Uint8Array(cred.response.clientDataJSON)),
        });*/
    } catch (e) {
        appendMessage(appState, e);
    }
}

async function transfer(appState: AppState, from: string, to: string) {
    /*try {
        await appState.api.transact(
            {
                actions: [{
                    account: 'eosio.token',
                    name: 'transfer',
                    data: {
                        from,
                        to,
                        quantity: '1.0000 SYS',
                        memo: '',
                    },
                    authorization: [{
                        actor: from,
                        permission: 'active',
                    }],
                }],
            }, {
                blocksBehind: 3,
                expireSeconds: 60 * 60,
            });
        appendMessage(appState, 'transaction pushed');
    } catch (e) {
        appendMessage(appState, e);
    }*/
}

async function blockchainAddKey(appState: AppState, accountID: string, keyID: string, key: string): Promise<Result>{
    if (!keyID)
        throw new Error("blockchainAddKey; 'KeyID' is not defined");
    
    if (!key)
        throw new Error("blockchainAddKey; 'Key' is not defined");

    const alphabet = '.12345abcdefghijklmnopqrstuvwxyz';
    var KEY_STRUCT = {
            "key_name": nanoid(alphabet, 12),
            "key": key,
            "wait_sec": 0,
            "weight": 1,
            "keyid": keyID
    };
    const result = await appState.connector.addKey(accountID, KEY_STRUCT);
    const isSucceeded = String(result.isSucceeded);
    appendMessage(appState, `Is transaction succeeded: ${isSucceeded}, description: ${result.desc}`);
    return result;
}

async function blockchainPropose(appState: AppState, accountID: string, requested_approvals: string[], trx: {}): Promise<Result>{
    if(!accountID)
        throw new Error("blockchainPropose; 'AccountID' is not defined");
    if (!requested_approvals || requested_approvals.length == 0)
        throw new Error("blockchainPropose; 'requested_approvals' is not defined");
    if (!trx)
        throw new Error("blockchainPropose; 'trx' is not defined");

    //randomly generated name    
    const alphabet = '.12345abcdefghijklmnopqrstuvwxyz';
    const proposalName = "rtyuikjhgty2";//nanoid(alphabet, 12);

    const result = await appState.connector.propose(accountID, proposalName, requested_approvals, trx);
    const isSucceeded = String(result.isSucceeded);
    appendMessage(appState, `Is transaction succeeded: ${isSucceeded}, description: ${result.desc}`);
    return result;
}

function createKeyArray(receivedKeys:any[]): Array<string>{
    var keyArray: string[] = new Array<string>();
    
    for (var item of receivedKeys){
        keyArray.push(item.key_name);
    }
    return keyArray;
}

async function propose(appState: AppState){
    try{
        if (!appState.accountID)
            throw new Error('AccountID is not defined. Please fill the field "AccountID".');

        //get/define the data
        const rpId = 'ubi.world';
        const rpName = rpId;
        const username = appState.accountID; //'Mo.Lestor'
        const displayName = username + "@gmail.com";
        const challenge = new Uint8Array([
            0x8C, 0x0A, 0x26, 0xFF, 0x22, 0x91, 0xC1, 0xE9, 0xB9, 0x4E, 0x2E, 0x17, 0x1A, 0x98, 0x6A, 0x73,
            0x71, 0x9D, 0x43, 0x48, 0xD5, 0xA7, 0x6A, 0x15, 0x7E, 0x38, 0x94, 0x52, 0x77, 0x97, 0x0F, 0xEF,
        ]);
        const id = '';

        //get timestamp; minutes
        var timestamp = new Date();
        timestamp.setMinutes(timestamp.getMinutes()+ 5);

        //"2021-03-18T11:25:23",
        var TEMP_FIXED_TRANSACTION = {
            "expiration": moment(timestamp).format("YYYY-MM-DDTHH:mm:ss"),
            "ref_block_num":0,
            "ref_block_prefix":0,
            "max_net_usage_words":0,
            "max_cpu_usage_ms":0,
            "delay_sec":0,
            "context_free_actions":false,
            "actions":[
                {
                    "account":"irowyourboat",
                    "name":"hi",
                    "authorization":
                    [
                        {
                            "actor":"rowuseruser1",
                            "permission":"active"
                        }
                    ],
                    "data":"10aec2fa2aac39bd"
            }
        ],
        "transaction_extensions":false
        };

        console.log("Getting data from the chain");
        //code, scope, table
        var keys = await appState.connector.getTableRows(environment.eosio.contract, appState.accountID, "authorities");
        const isSucceeded = String(keys.isSucceeded);
        if (!keys.isSucceeded)
            throw new Error("Getting data from the chain failed with error: " + keys.desc);
        
        console.log(keys.desc.length);

        var keyArray = createKeyArray(keys.desc.keys);
        if (keyArray.length == 0)
            throw new Error('No keys on chain under current account. Please add key and then make new process');

        //send data to the blockchain
        var result: Result = await blockchainPropose(appState, appState.accountID, keyArray, TEMP_FIXED_TRANSACTION);
        
        if (!result.isSucceeded)
            throw new Error('Propose; Sending transaction to the server failed: ' + result.desc);

        appendMessage(appState, "New proposal with account " + appState.accountID + " has been added on chain");
    } catch (e) {
        //show in console
        console.log(e);
        //show on UIk
        appendMessage(appState, e);
    }
}

async function approve(appState: AppState){
    /*
        TODO: create approve flow
    */


    //get some id from blockchain
    //use that id to sign transaction on webauthn protocol
    const TEMP_FIXED_USER : string = "rowuseruser1";
    
    //get timestamp; minutes
    var timestamp = new Date();
    timestamp.setMinutes(timestamp.getMinutes()+ 5);

    //"2021-03-18T11:25:23",
    var TEMP_FIXED_TRANSACTION = {
        "expiration": moment(timestamp).format("YYYY-MM-DDTHH:mm:ss"),
        "ref_block_num":0,
        "ref_block_prefix":0,
        "max_net_usage_words":0,
        "max_cpu_usage_ms":0,
        "delay_sec":0,
        "context_free_actions":false,
        "actions":[
            {
                "account":"irowyourboat",
                "name":"hi",
                "authorization":
                [
                    {
                        "actor":"rowuseruser1",
                        "permission":"active"
                    }
                ],
                "data":"10aec2fa2aac39bd"
        }
    ],
    "transaction_extensions":false
    };
    const result = await appState.connector.approve(TEMP_FIXED_USER, TEMP_FIXED_TRANSACTION);
    const isSucceeded = String(result.isSucceeded);
    appendMessage(appState, `Is transaction succeeded: ${isSucceeded}, description: ${result.desc}`);
}

async function getTable(appState: AppState){
    const TEMP_FIXED_USER : string = "rowuseruser1";

    const result = await appState.connector.getTableRows('eosio.token', TEMP_FIXED_USER, 'accounts');
    if (Array.isArray(result))
        appendMessage(appState, result.toString());
    else
        appendMessage(appState, result.desc);
}


function Controls({ appState }: { appState: AppState }) {
    return (
        <div className='control'>
            <button onClick={() => { createKey(appState); }}>Create Key</button>
            <button onClick={() => { transfer(appState, 'usera', 'userb'); }}>usera to userb</button>
            <button onClick={() => { transfer(appState, 'userb', 'usera'); }}>userb to usera</button>
            <button onClick={() => { transfer(appState, 'userc', 'userd'); }}>userc to userd</button>
            <button onClick={() => { transfer(appState, 'userd', 'userc'); }}>userd to userc</button>
            <br/>
            <button onClick={() => { propose(appState); }}>Propose</button>
            <button onClick={() => { getTable(appState); }}>Get table rows</button>
            <button onClick={() => { approve(appState); }}>Approve</button>
            <br/>
            <button onClick={() => { registerDevice(appState); }}>Register device</button>
        </div>
    );
}

function Balances({ appState }: { appState: AppState }) {
    return (
        <div className='balance'>
            <table>
                <tbody>
                    {Array.from(appState.balances).sort().map(([user, bal]) => <tr key={user}><td>{user}</td><td>{bal}</td></tr>)}
                </tbody>
            </table>
        </div>
    );
}

class ClientRoot extends React.Component<{ appState: AppState }> {



    public render() {
        const { appState } = this.props;
        appState.clientRoot = this;
        return (
            <div className='client-root'>
                <div className='banner'>
                    Example application demonstrating WebAuthn based account creation and transactions on private blockchains
                </div>
                <Controls appState={appState} />
                <Balances appState={appState} />
                
                <pre className='keys'>
                Account ID:
                <input
                    className='accountId'
                    type="text" 
                    value={appState.accountID}
                    id={'accountID'}
                    onChange={e => appState.changeAccountID(e.target.value)}
                />
                </pre>
                {/*<pre className='keys'>{'Keys:\n' + appState.keys.map(k => k.key).join('\n')}</pre>*/}
                <pre className='message'>{'Messages:\n' + appState.message}</pre>
                <div className='disclaimer'>
                    EOSIO Labs repositories are experimental. Developers in the community are encouraged to use EOSIO Labs
                    repositories as the basis for code and concepts to incorporate into their applications. Community members
                    are also welcome to contribute and further develop these repositories. Since these repositories are not
                    supported by Block.one, we may not provide responses to issue reports, pull requests, updates to
                    functionality, or other requests from the community, and we encourage the community to take responsibility
                    for these.
                    <br /><br />
                    <a href='https://github.com/EOSIO/webauthn-browser-signature'>GitHub Repo</a>
                </div>
            </div>
        );
    }
}

export default function init(prev: AppState) {
    const appState = new AppState();
    if (prev) {
        appState.restore(prev);
        prev.alive = false;
        if (prev.io)
            prev.io.close();
    }
    connectSocket(appState);
    ReactDOM.render(<ClientRoot {...{ appState }} />, document.getElementById('main'));
    return appState;
}