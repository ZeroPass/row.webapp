import { AppState } from "../ClientRoot";
import { Result, Connector } from "./connector";
import { environment } from "./../other/constant";
import {  AuthKey, WaPublicKey, WaSignature } from "../../common/Key";

export default class ConnectorEos {
    appState: AppState;
    connector: Connector;

    constructor(appState: AppState) {
        this.appState = appState;
        this.connector = new Connector(environment.eosio.host);
    }

    static createLinkOnBlockExplorer(transactionID: string): string{
      return environment.eosio.blockExplorerURL + "/transaction/" + transactionID;
    }

    public async addKey(
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
        const authKey = new AuthKey(keyName, pubKey, wait_sec, weight, keyID);
        const result = await this.connector.addKey(accountID, authKey);
        const isSucceeded = String(result.isSucceeded);
        this.appState.appendMessage(
          `Is transaction succeeded: ${isSucceeded}, description: ${ConnectorEos.createLinkOnBlockExplorer(result.desc)}`
        );
        return result;
    }

    async serializeTransaction(transaction: any){
      return this.connector.serializeTransaction(transaction);
  }

    async getTableRows(code: string, scope: string, table: string, lower_bound: string = undefined, upper_bound: string = undefined ){
        return this.connector.getTableRows(code, scope, table, lower_bound, upper_bound);
    }
    async getProposal(account: string, proposalName: string) : Promise<any> {
      return this.connector.getProposal(account, proposalName);
    }

    async getAuthKeys(account: string) : Promise<Array<AuthKey>> {
      return this.connector.getAuthKeys(account);
    }

    async getAuthKey(account: string, keyName: string) : Promise<AuthKey> {
      return this.connector.getAuthKey(account, keyName);
    }

    async exec(accountID: string, proposal_name: string): Promise<Result> {
      if (!accountID)
        throw new Error("blockchainApprove; 'accountID' is not defined");
      if (!proposal_name)
        throw new Error("blockchainApprove; 'proposal_name' is not defined");

      const result = await this.connector.exec(
        accountID,
        proposal_name,
      );
      const isSucceeded = String(result.isSucceeded);
      this.appState.appendMessage(
        `Proposed transaction has been executed:  ${isSucceeded}, description: ${result.desc}`
      );
      return result;
    }

    public async propose(
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

        const result = await this.connector.propose(
          accountID,
          accountID,
          requested_approvals,
          trx
        );
        const isSucceeded = String(result.isSucceeded);
        this.appState.appendMessage(
          `Is transaction succeeded: ${isSucceeded}, description: ${result.desc}`
        );
        return result;
      }

      public async approve(user: string, proposal_name: string, key_name: string, signature: WaSignature): Promise<Result> {
        if (!user)
          throw new Error("blockchainApprove; 'user' is not defined");
        if (!proposal_name)
          throw new Error("blockchainApprove; 'proposal_name' is not defined");
        if (!key_name)
          throw new Error("blockchainApprove; 'key_name' is not defined");
        if (!signature)
          throw new Error("blockchainApprove; 'signature' is not defined");
    
          const result = await this.connector.approve(
            user,
            proposal_name,
            key_name,
            signature
          );
        const isSucceeded = String(result.isSucceeded);
        this.appState.appendMessage(
          `Is transaction succeeded: ${isSucceeded}, description: ${result.desc}`
        );
        return result;
      }

      public async cancel(user: string, proposal_name: string): Promise<Result> {
        if (!user)
          throw new Error("blockchainCancel; 'user' is not defined");
        if (!proposal_name)
          throw new Error("blockchainCancel; 'proposal_name' is not defined");
    
          const result = await this.connector.cancel(
            user,
            proposal_name
          );
        const isSucceeded = String(result.isSucceeded);
        this.appState.appendMessage(
          `Is transaction succeeded: ${isSucceeded}, description: ${result.desc}`
        );
        return result;
      }

      public async testwasig(accountID: string, pubkey: WaPublicKey, signed_hash: string, sig: WaSignature): Promise<Result> {
        if (!accountID)
          throw new Error("testwasig; 'accountID' is not defined");
        if (!pubkey)
          throw new Error("testwasig; 'pubkey' is not defined");
        if (!signed_hash)
          throw new Error("testwasig; 'signed_hash' is not defined");
        if (!sig)
          throw new Error("testwasig; 'sig' is not defined");

          const result = await this.connector.testwasig(
            accountID,
            pubkey,
            signed_hash,
            sig
          );
        const isSucceeded = String(result.isSucceeded);
        this.appState.appendMessage(
          `Is transaction succeeded: ${isSucceeded}, description: ${result.desc}`
        );
        return result;
      }
      
}