import * as express from 'express';
import * as fs from 'fs';
import * as SocketIO from 'socket.io';
import { WaKey } from '../common/Key';

const keysPath = 'keys.json';

let unloadedModule = false;
export const router = express.Router();


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

let keys = [] as WaKey[];
function loadKeys() {
    try {
        keys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
    } catch (e) {
        console.error(e.message);
        console.error('Assuming keys are empty');
    }
}

async function sendKeys() {
    socket.emit('keys', keys);
}

async function addKey(k: AddKeyArgs) {
}

let socketIO: SocketIO.Server;
export function start(io: SocketIO.Server) {
    socketIO = io;
    loadKeys();
}

let socket: SocketIO.Socket;
export function connected(sock: SocketIO.Socket) {
    console.log('socket connected');
    sock.on('addKey', addKey);
    socket = sock;
    sendKeys();
}

export function unloading() {
    console.log('unload');
    unloadedModule = true;
}

console.log('\nLoaded server\n');
