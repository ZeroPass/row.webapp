import { Api, JsonRpc, Serialize, Numeric} from 'eosjs';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as IoClient from 'socket.io-client';
import { Key } from '../common/Key';
import { WaSignatureProvider } from './wasig';
require('fast-text-encoding');  
 
//'use strict'
const cbor = require('cbor-web');

require('./style.css');

const socketUrl = 'https://ubi.world:8000';

class AppState {
    public alive = true;
    public io: SocketIOClient.Socket;
    public clientRoot: ClientRoot;
    public keys = [] as Key[];
    public sigprov = new WaSignatureProvider();
    public rpc = new JsonRpc('http://localhost:8888');
    public api: Api;
    public message = '';
    public balances = new Map<string, string>();

    constructor() {
        this.api = new Api({ rpc: this.rpc, signatureProvider: this.sigprov });
        this.updateBalance('usera');
        this.updateBalance('userb');
        this.updateBalance('userc');
        this.updateBalance('userd');
    }

    public restore(prev: AppState) {
        this.message = prev.message;
        this.setKeys(prev.keys);
    }

    public setKeys(keys: Key[]) {
        this.keys = keys;
        this.sigprov.keys.clear();
        for (const key of this.keys)
            this.sigprov.keys.set(key.key, key.credentialId);
    }

    private async updateBalance(name: string) {
        while (this.alive) {
            try {
                await delay(200);
                this.balances.set(name, (await this.rpc.get_currency_balance('eosio.token', name))[0]);
                if (this.clientRoot)
                    this.clientRoot.forceUpdate();
            } catch (e) {
                console.log(e);
            }
        }
    }
}

function appendMessage(appState: AppState, message: string) {
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
    console.log("15345------------");
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
        
    console.log("1533-----------");
    const ser = new Serialize.SerialBuffer({textEncoder:  new TextEncoder(), textDecoder: new TextDecoder()});
    console.log("153------------");
    ser.push((y[31] & 1) ? 3 : 2);
    ser.pushArray(x);
    ser.push(flagsToPresence(flags));
    ser.pushString(k.rpid);
    const compact = ser.asUint8Array();
    const key = Numeric.publicKeyToString({
        type: Numeric.KeyType.wa,
        data: compact,
    });
    console.log("153-----------1");
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
    console.log("153-----------2");
    return {
        credentialId: Serialize.arrayToHex(credentialId),
        key,
    };
}

/////

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
        console.log(cred);

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
    try {
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
    }
}

function Controls({ appState }: { appState: AppState }) {
    return (
        <div className='control'>
            <button onClick={() => { createKey(appState); }}>Create Key</button>
            <button onClick={() => { transfer(appState, 'usera', 'userb'); }}>usera to userb</button>
            <button onClick={() => { transfer(appState, 'userb', 'usera'); }}>userb to usera</button>
            <button onClick={() => { transfer(appState, 'userc', 'userd'); }}>userc to userd</button>
            <button onClick={() => { transfer(appState, 'userd', 'userc'); }}>userd to userc</button>
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
                <pre className='keys'>{'Keys:\n' + appState.keys.map(k => k.key).join('\n')}</pre>
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


declare module customUtils1 {
    interface InspectOptions extends NodeJS.InspectOptions { }
    function format(format: any, ...param: any[]): string;
    function formatWithOptions(inspectOptions: InspectOptions, format: string, ...param: any[]): string;
    /** @deprecated since v0.11.3 - use `console.error()` instead. */
    function debug(string: string): void;
    /** @deprecated since v0.11.3 - use `console.error()` instead. */
    function error(...param: any[]): void;
    /** @deprecated since v0.11.3 - use `console.log()` instead. */
    function puts(...param: any[]): void;
    /** @deprecated since v0.11.3 - use `console.log()` instead. */
    function print(...param: any[]): void;
    /** @deprecated since v0.11.3 - use a third party module instead. */
    function log(string: string): void;
    function inspect(object: any, showHidden?: boolean, depth?: number | null, color?: boolean): string;
    function inspect(object: any, options: InspectOptions): string;
    namespace inspect {
        let colors: {
            [color: string]: [number, number] | undefined
        };
        let styles: {
            [style: string]: string | undefined
        };
        let defaultOptions: InspectOptions;
        /**
         * Allows changing inspect settings from the repl.
         */
        let replDefaults: InspectOptions;
    }
    /** @deprecated since v4.0.0 - use `Array.isArray()` instead. */
    function isArray(object: any): object is any[];
    /** @deprecated since v4.0.0 - use `util.types.isRegExp()` instead. */
    function isRegExp(object: any): object is RegExp;
    /** @deprecated since v4.0.0 - use `util.types.isDate()` instead. */
    function isDate(object: any): object is Date;
    /** @deprecated since v4.0.0 - use `util.types.isNativeError()` instead. */
    function isError(object: any): object is Error;
    function inherits(constructor: any, superConstructor: any): void;
    function debuglog(key: string): (msg: string, ...param: any[]) => void;
    /** @deprecated since v4.0.0 - use `typeof value === 'boolean'` instead. */
    function isBoolean987(object: any): object is boolean;
    /** @deprecated since v4.0.0 - use `Buffer.isBuffer()` instead. */
    function isBuffer(object: any): object is Buffer;
    /** @deprecated since v4.0.0 - use `typeof value === 'function'` instead. */
    function isFunction(object: any): boolean;
    /** @deprecated since v4.0.0 - use `value === null` instead. */
    function isNull(object: any): object is null;
    /** @deprecated since v4.0.0 - use `value === null || value === undefined` instead. */
    function isNullOrUndefined(object: any): object is null | undefined;
    /** @deprecated since v4.0.0 - use `typeof value === 'number'` instead. */
    function isNumber(object: any): object is number;
    /** @deprecated since v4.0.0 - use `value !== null && typeof value === 'object'` instead. */
    function isObject(object: any): boolean;
    /** @deprecated since v4.0.0 - use `(typeof value !== 'object' && typeof value !== 'function') || value === null` instead. */
    function isPrimitive(object: any): boolean;
    /** @deprecated since v4.0.0 - use `typeof value === 'string'` instead. */
    function isString(object: any): object is string;
    /** @deprecated since v4.0.0 - use `typeof value === 'symbol'` instead. */
    function isSymbol(object: any): object is symbol;
    /** @deprecated since v4.0.0 - use `value === undefined` instead. */
    function isUndefined(object: any): object is undefined;
    function deprecate<T extends Function>(fn: T, message: string): T;
    function isDeepStrictEqual(val1: any, val2: any): boolean;

    interface CustomPromisify<TCustom extends Function> extends Function {
        __promisify__: TCustom;
    }

    function callbackify(fn: () => Promise<void>): (callback: (err: NodeJS.ErrnoException) => void) => void;
    function callbackify<TResult>(fn: () => Promise<TResult>): (callback: (err: NodeJS.ErrnoException, result: TResult) => void) => void;
    function callbackify<T1>(fn: (arg1: T1) => Promise<void>): (arg1: T1, callback: (err: NodeJS.ErrnoException) => void) => void;
    function callbackify<T1, TResult>(fn: (arg1: T1) => Promise<TResult>): (arg1: T1, callback: (err: NodeJS.ErrnoException, result: TResult) => void) => void;
    function callbackify<T1, T2>(fn: (arg1: T1, arg2: T2) => Promise<void>): (arg1: T1, arg2: T2, callback: (err: NodeJS.ErrnoException) => void) => void;
    function callbackify<T1, T2, TResult>(fn: (arg1: T1, arg2: T2) => Promise<TResult>): (arg1: T1, arg2: T2, callback: (err: NodeJS.ErrnoException | null, result: TResult) => void) => void;
    function callbackify<T1, T2, T3>(fn: (arg1: T1, arg2: T2, arg3: T3) => Promise<void>): (arg1: T1, arg2: T2, arg3: T3, callback: (err: NodeJS.ErrnoException) => void) => void;
    function callbackify<T1, T2, T3, TResult>(
        fn: (arg1: T1, arg2: T2, arg3: T3) => Promise<TResult>): (arg1: T1, arg2: T2, arg3: T3, callback: (err: NodeJS.ErrnoException | null, result: TResult) => void) => void;
    function callbackify<T1, T2, T3, T4>(
        fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<void>): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, callback: (err: NodeJS.ErrnoException) => void) => void;
    function callbackify<T1, T2, T3, T4, TResult>(
        fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<TResult>): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, callback: (err: NodeJS.ErrnoException | null, result: TResult) => void) => void;
    function callbackify<T1, T2, T3, T4, T5>(
        fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => Promise<void>): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, callback: (err: NodeJS.ErrnoException) => void) => void;
    function callbackify<T1, T2, T3, T4, T5, TResult>(
        fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => Promise<TResult>,
    ): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, callback: (err: NodeJS.ErrnoException | null, result: TResult) => void) => void;
    function callbackify<T1, T2, T3, T4, T5, T6>(
        fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6) => Promise<void>,
    ): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, callback: (err: NodeJS.ErrnoException) => void) => void;
    function callbackify<T1, T2, T3, T4, T5, T6, TResult>(
        fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6) => Promise<TResult>
    ): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6, callback: (err: NodeJS.ErrnoException | null, result: TResult) => void) => void;

    function promisify<TCustom extends Function>(fn: CustomPromisify<TCustom>): TCustom;
    function promisify<TResult>(fn: (callback: (err: Error | null, result: TResult) => void) => void): () => Promise<TResult>;
    function promisify(fn: (callback: (err?: Error) => void) => void): () => Promise<void>;
    function promisify<T1, TResult>(fn: (arg1: T1, callback: (err: Error | null, result: TResult) => void) => void): (arg1: T1) => Promise<TResult>;
    function promisify<T1>(fn: (arg1: T1, callback: (err?: Error) => void) => void): (arg1: T1) => Promise<void>;
    function promisify<T1, T2, TResult>(fn: (arg1: T1, arg2: T2, callback: (err: Error | null, result: TResult) => void) => void): (arg1: T1, arg2: T2) => Promise<TResult>;
    function promisify<T1, T2>(fn: (arg1: T1, arg2: T2, callback: (err?: Error) => void) => void): (arg1: T1, arg2: T2) => Promise<void>;
    function promisify<T1, T2, T3, TResult>(fn: (arg1: T1, arg2: T2, arg3: T3, callback: (err: Error | null, result: TResult) => void) => void): (arg1: T1, arg2: T2, arg3: T3) => Promise<TResult>;
    function promisify<T1, T2, T3>(fn: (arg1: T1, arg2: T2, arg3: T3, callback: (err?: Error) => void) => void): (arg1: T1, arg2: T2, arg3: T3) => Promise<void>;
    function promisify<T1, T2, T3, T4, TResult>(
        fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, callback: (err: Error | null, result: TResult) => void) => void,
    ): (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<TResult>;
    function promisify<T1, T2, T3, T4>(fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, callback: (err?: Error) => void) => void): (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<void>;
    function promisify<T1, T2, T3, T4, T5, TResult>(
        fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, callback: (err: Error | null, result: TResult) => void) => void,
    ): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => Promise<TResult>;
    function promisify<T1, T2, T3, T4, T5>(
        fn: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, callback: (err?: Error) => void) => void,
    ): (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => Promise<void>;
    function promisify(fn: Function): Function;

    namespace types {
        function isAnyArrayBuffer(object: any): boolean;
        function isArgumentsObject(object: any): object is IArguments;
        function isArrayBuffer(object: any): object is ArrayBuffer;
        function isAsyncFunction(object: any): boolean;
        function isBooleanObject(object: any): object is Boolean;
        function isBoxedPrimitive(object: any): object is (Number | Boolean | String | Symbol /* | Object(BigInt) | Object(Symbol) */);
        function isDataView(object: any): object is DataView;
        function isDate(object: any): object is Date;
        function isExternal(object: any): boolean;
        function isFloat32Array(object: any): object is Float32Array;
        function isFloat64Array(object: any): object is Float64Array;
        function isGeneratorFunction(object: any): boolean;
        function isGeneratorObject(object: any): boolean;
        function isInt8Array(object: any): object is Int8Array;
        function isInt16Array(object: any): object is Int16Array;
        function isInt32Array(object: any): object is Int32Array;
        function isMap(object: any): boolean;
        function isMapIterator(object: any): boolean;
        function isModuleNamespaceObject(value: any): boolean;
        function isNativeError(object: any): object is Error;
        function isNumberObject(object: any): object is Number;
        function isPromise(object: any): boolean;
        function isProxy(object: any): boolean;
        function isRegExp(object: any): object is RegExp;
        function isSet(object: any): boolean;
        function isSetIterator(object: any): boolean;
        function isSharedArrayBuffer(object: any): boolean;
        function isStringObject(object: any): boolean;
        function isSymbolObject(object: any): boolean;
        function isTypedArray(object: any): object is NodeJS.TypedArray;
        function isUint8Array(object: any): object is Uint8Array;
        function isUint8ClampedArray(object: any): object is Uint8ClampedArray;
        function isUint16Array(object: any): object is Uint16Array;
        function isUint32Array(object: any): object is Uint32Array;
        function isWeakMap(object: any): boolean;
        function isWeakSet(object: any): boolean;
        function isWebAssemblyCompiledModule(object: any): boolean;
    }

    export class CustomTextDecoder {
        readonly encoding: string;
        readonly fatal: boolean;
        readonly ignoreBOM: boolean;
        constructor(
          encoding?: string,
          options?: { fatal?: boolean; ignoreBOM?: boolean }
        );
        decode(
          input?: NodeJS.TypedArray | DataView | ArrayBuffer | null,
          options?: { stream?: boolean }
        ): string;
    }

    export class CustomTextEncoder {
        readonly encoding: string;
        encode(input?: string): Uint8Array;
    }
}
