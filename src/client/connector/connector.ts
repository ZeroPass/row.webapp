import { Api, JsonRpc, Serialize, Numeric, RpcError } from 'eosjs';
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');
import { WaSignatureProvider } from '../cryptgraphy/wasig';
import {environment} from '../other/constant';
import * as assert from 'assert';
import {  deserializeWaPublicKey, WaSignature, WaPublicKey, AuthKey } from "../../common/Key";

export class Result{
    public isSucceeded : boolean;
    public desc : any;

    constructor(isSuccedded: boolean, desc: any){
        this.isSucceeded = isSuccedded;
        this.desc = desc;
    }
}

export class Connector{
    public apiFIDO: Api;
    public api : Api;
    public sigprov = new WaSignatureProvider();
    private rpc: JsonRpc;

    constructor(url: string) {
        assert(url);
        assert(url.length > 0);
        assert(environment.eosio.privateKeyTemp);

        this.rpc = new JsonRpc(url);

        //fixed private key - just for presentation
        const defaultPrivateKey = environment.eosio.privateKeyTemp;
        const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);
        this.api =  new Api({ rpc: this.rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

        //multisig - FIDO private key
        this.apiFIDO = new Api({ rpc: this.rpc, signatureProvider: this.sigprov });
    }

    async checkServer(): Promise<Result>{
        try{
            const result = await this.rpc.get_info();
            console.log(result);
            return new Result(true, "");
        } catch (e) {
            return new Result(false, e);
        }
    }

    async serializeTransaction(transaction: any){
        return this.api.serializeActions(transaction);
    }

    async getTableRows(code: string, scope: string, table: string, lower_bound: string = undefined, upper_bound: string = undefined ){
        try
        {
            var parameters = {};

            if (lower_bound == undefined || upper_bound == undefined)
            parameters = {
                code: code,
                scope: scope,
                table: table,
                json: true
            };
            else
            parameters = {
                code: code,
                scope: scope,
                table: table,
                json: true,
                lower_bound: lower_bound,
                upper_bound: upper_bound
            };

            const resp = await this.rpc.get_table_rows(parameters);
            return new Result(true, resp.rows);
            }
            catch (e) {
                //return RPC error
                if (e instanceof RpcError){
                    console.log("Connector:getTableRows; RPC error: " + JSON.stringify(e.json, null, 2));
                    return new Result(false,JSON.stringify(e.json, null, 2));
                }
                //return basic result
                console.log("Connector:getTableRows; Error: " + e);
                return new Result(false, e);
            }
    }

    async getProposal(account: string, proposalName: string) : Promise<any> {
        try
        {
            var proposals = await this.getTableRows(environment.eosio.contract, account,"proposals");
            if (!proposals.isSucceeded) {
                throw new Error("Getting proposals from chain failed with error: " + proposals.desc);
            }
            for (const p of proposals.desc) {
                if (p.proposal_name == proposalName) {
                    return p;
                }
            }
            throw new Error("No proposal named '" + proposalName + "' is stored under account '" + account + "'");
        }
        catch(e){
            throw new Error("Exception thrown in 'connector:getProposal':" + e);
        }
    }

    async getAccountAuthority(account: string) : Promise<any> {
        var auths = await this.getTableRows(environment.eosio.contract, account, "authorities");
        if (!auths.isSucceeded) {
           throw new Error("Failed to get the list of authKeys from chain! error: " + auths.desc);
        }
        if (auths.desc.length == 0) {
          throw new Error(
            "No authority entry on chain for the account. Please add key and then make new process"
          );
        }
        return auths.desc[0];
    }

    async getAuthKeys(account: string) : Promise<Array<AuthKey>> {
        try{
           var auths = await this.getAccountAuthority(account);
           var keys = auths.keys
           for (var k of keys) {
                k.wa_pubkey = deserializeWaPublicKey(k.wa_pubkey);
           }
           return keys;
       }
       catch(e){
           throw new Error("Exception thrown in 'connector:getAuthKeys':" + e);
       }
   }

    async getAuthKey(account: string, keyName: string) : Promise<AuthKey> {
        var keys = await this.getAuthKeys(account);
        for (const k of keys) {
            if (k.key_name == keyName) {
                return k;
            }
        }
        throw new Error("No authorization key named '" + keyName + "' is stored under authorities of account '" + account + "'");
    }

    async addKey(user: string, authKey: AuthKey): Promise<Result> {
        try {

            authKey.wa_pubkey = authKey.wa_pubkey.serialize();
            const result = await this.api.transact(
                {
                    actions: [{
                        account: environment.eosio.contract,
                        name: 'addkey',
                        data: {
                            account: user,
                            key: authKey
                        },
                        authorization: [{
                            actor: user,
                            permission: 'active',
                        }],
                    }],
                }, {
                    blocksBehind: 3,
                    expireSeconds: 30,
                });
            console.log(result);
            return new Result(true, result.transaction_id);
        } catch (e) {
            //reutnr RPC error
            if (e instanceof RpcError){
                console.log("Connector:propose; RPC error: " + JSON.stringify(e.json, null, 2));
                return new Result(false,JSON.stringify(e.json, null, 2));
            }
            //return basic result
            console.log("Connector:propose; Error: " + e);
            return new Result(false, e);
        }
    }

    async propose(user: string, proposalName: string, requested_approvals: string[], trx: {}): Promise<Result> {
        try {

            // Get tapos values and expiration
            // Note generateTapos is private member of Api
            const tx_header = await (<any>this.api).generateTapos(undefined, {}, undefined, /*useLastIrreversible:*/true, /*expireSeconds:*/180);

            // Update proposed trx tapos values
            trx = { ...trx, ref_block_num: tx_header.ref_block_num, ref_block_prefix: tx_header.ref_block_prefix }

            // Send proposae transaction
            const result = await this.api.transact(
                {
                    expiration: tx_header.expiration,
                    ref_block_num: tx_header.ref_block_num,
                    ref_block_prefix: tx_header.ref_block_prefix,
                    actions: [{
                        account: environment.eosio.contract,
                        name: 'propose',
                        data: {
                            account: user,
                            proposal_name: proposalName,
                            requested_approvals: requested_approvals,
                            trx: trx,
                        },
                        authorization: [{
                            actor: user,
                            permission: 'rowmsig',
                        }],
                    }],
                }, {
                    blocksBehind: 3,
                    expireSeconds: 30,
                });
            console.log(result);
            return new Result(true, result.transaction_id);
        } catch (e) {
            //returnd RPC error
            if (e instanceof RpcError){
                console.log("Connector:propose; RPC error: " + JSON.stringify(e.json, null, 2));
                return new Result(false,JSON.stringify(e.json, null, 2));
            }
            //return basic result
            console.log("Connector:propose; Error: " + e);
            return new Result(false, e);
        }
    }

    async approve(user: string, proposal_name: string, key_name: string, signature: WaSignature): Promise<Result> {
        try {
            const result = await this.api.transact(
                {
                    actions: [{
                        account: environment.eosio.contract,
                        name: 'approve',
                        data: {
                            account: user,
                            proposal_name: proposal_name,
                            key_name: key_name,
                            signature: signature
                        },
                        authorization: [{
                            actor: user,
                            permission: 'rowmsig',
                        }],
                    }],
                }, {
                    blocksBehind: 3,
                    expireSeconds: 30,
                });
            console.log(result);
            return new Result(true, result.transaction_id);
        } catch (e) {
            //reutnr RPC error
            if (e instanceof RpcError){
                console.log("Connector:approve; RPC error: " + JSON.stringify(e.json, null, 2));
                return new Result(false,JSON.stringify(e.json, null, 2));
            }
            //return basic result
            console.log("Connector:approve; Error: " + e);
            return new Result(false, e);
        }
    }

    async cancel(user: string, proposal_name: string): Promise<Result> {
        try {
            const result = await this.api.transact(
                {
                    actions: [{
                        account: environment.eosio.contract,
                        name: 'cancel',
                        data: {
                            account: user,
                            proposal_name: proposal_name,
                        },
                        authorization: [{
                            actor: user,
                            permission: 'active', //'wamsig'
                        }],
                    }],
                }, {
                    blocksBehind: 3,
                    expireSeconds: 30,
                });
            console.log(result);
            return new Result(true, result.transaction_id);
        } catch (e) {
            //return RPC error
            if (e instanceof RpcError){
                console.log("Connector:cancel; RPC error: " + JSON.stringify(e.json, null, 2));
                return new Result(false,JSON.stringify(e.json, null, 2));
            }
            //return basic result
            console.log("Connector:cancel; Error: " + e);
            return new Result(false, e);
        }
    }

    async exec(accountID: string, proposal_name: string): Promise<Result> {
        try {
            if (!accountID)
              throw new Error(
                'AccountID is not defined. Please fill the field "AccountID".'
              );
              if (!proposal_name)
              throw new Error(
                'proposal_name is not defined.'
              );

            const result = await this.api.transact(
            {
                actions: [{
                    account: environment.eosio.contract,
                    name: 'exec',
                    data: {
                        account: accountID,
                        proposal_name: proposal_name,
                    },
                    authorization: [{
                        actor: accountID,
                        permission: 'active', //'wamsig'
                    }],
                }],
            }, {
                blocksBehind: 3,
                expireSeconds: 30,
            });
            return new Result(true, result.transaction_id);
          }
          catch(e) {
            //return RPC error
            if (e instanceof RpcError){
                console.log("Connector:cancel; RPC error: " + JSON.stringify(e.json, null, 2));
                return new Result(false,JSON.stringify(e.json, null, 2));
            }
            //return basic result
            console.log("Connector:cancel; Error: " + e);
            return new Result(false, e);
          }
        }

        async testwasig(accountID: string, pubkey: WaPublicKey, signed_hash: string, sig: WaSignature): Promise<Result> {
            try {
                if (!accountID)
                  throw new Error('accountID is not defined.');
                if (!pubkey)
                  throw new Error('pubkey is not defined.');
                if (!signed_hash)
                  throw new Error('signed_hash is not defined.');
                if (!sig)
                  throw new Error('sig is not defined.');

                const result = await this.api.transact(
                    {
                        actions: [{
                            account: environment.eosio.contract,
                            name: 'testwasig',
                            data: {
                              pubkey: pubkey.serialize(),
                              signed_hash: signed_hash,
                              sig:sig,
                            },
                            authorization: [{
                                actor: accountID,
                                permission: 'active', //'wamsig'
                            }],
                        }],
                    }, {
                        blocksBehind: 3,
                        expireSeconds: 30,
                    });
                return new Result(true, result.transaction_id);
              }
              catch(e) {
                //return RPC error
                if (e instanceof RpcError){
                    console.log("Connector:cancel; RPC error: " + JSON.stringify(e.json, null, 2));
                    return new Result(false,JSON.stringify(e.json, null, 2));
                }
                //return basic result
                console.log("Connector:cancel; Error: " + e);
                return new Result(false, e);
              }
        }
}