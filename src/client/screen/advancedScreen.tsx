import * as React from "react";
import {AppState, propose, approve, registerDevice, exec} from "../ClientRoot";


//<Controls appState={appState} />

function Controls({ appState }: { appState: AppState }) {
  return (
    <div className="control">
      <button
        onClick={() => {
          propose(appState);
        }}
      >
        Propose
      </button>
      <button
        onClick={() => {
          approve(appState);
        }}
      >
        Approve
      </button>
      <button
        onClick={() => {
          exec(appState);
        }}
      >
        Execute
      </button>

      <br />
      <button
        onClick={() => {
          registerDevice(appState);
        }}
      >
        Register device
      </button>
    </div>
  );
}

export default class AdvancedScreen extends React.Component<{ appState: AppState }> {
    pointer: number; 
    componentDidMount() {
      this.pointer = 3;
    }
    render() {
      const { appState } = this.props;
      return (
<div className="client-root">

<div className="banner">
  Example application demonstrating WebAuthn based account creation and
  transactions on private blockchains
</div>

<Controls appState={appState} />

<pre className="keys">
  Account ID:
  <input
    className="accountId"
    type="text"
    //value={appState.accountID}
    id={"accountID"}
    onChange={(e) => appState.changeAccountID(e.target.value)}
  />
  <br></br>
  Key Name:
  <input
    className="keyName"
    type="text"
    //value={appState.accountID}
    id={"keyName"}
    onChange={(e) => appState.setKeyName(e.target.value)}
  />
</pre>
<pre className="message">{"Messages:\n" + appState.message}</pre>
<div className="disclaimer">
</div> 
</div>
      );
    }
  }