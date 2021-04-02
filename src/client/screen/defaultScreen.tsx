import * as React from "react";
import {AppState, propose, approve, registerDevice, exec} from "../ClientRoot";
import { makeStyles, Grid } from '@material-ui/core';
require("./../app.css");

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

export default class DefaultScreen extends React.Component<{ appState: AppState }> {
    pointer: number; 
    componentDidMount() {
      this.pointer = 3;
    }
    render() {
      const { appState } = this.props;
      return (
        <div>
        <Grid container className="container">
          <Grid item xs={12} md={6} className="item11">Home</Grid>
          <Grid item xs={12} md={6} className="item12">About</Grid>
        </Grid>
        <Grid container className="container">
          <Grid item xs={12} md={6} className="item21">
            <div className="divClass">
              <img src="https://dwglogo.com/wp-content/uploads/2017/09/1460px-React_logo.png" alt={`ZP picture`}  className="img-responsive" />
            </div>

          </Grid>
          <Grid item xs={12} md={6} className="item22">

          <div className="col-lg-7">
                <h3>What is WebAuthn?</h3>
                <p>Welcome to webauthn.io! This site is designed by <a href="https://duo.com/labs">Duo Labs</a> to test
                    the new
                    W3C Specification Web Authentication. WebAuthn is supported in the Chrome,
                    Firefox, and Edge browsers to different degrees, but support for credential
                    creation and assertion using a U2F Token, like those provided by Yubico and
                    Feitian, is supported by all of them. The code for this demo can be found
                    <a href="https://github.com/duo-labs/webauthn.io">here on GitHub</a>. To read more about WebAuthn
                    and what is does, check out
                    <a href="https://webauthn.guide">webauthn.guide</a> for an introduction.</p>
                <div className="row">
                    <div className="col-md-8 col-sm-12">
                        <a href="https://webauthn.guide" className="btn btn-primary btn-lg w-100">
                            Read more at webauthn.guide
                        </a>
                    </div>
                </div>
            </div>

          </Grid>
      </Grid>
      </div>
      );
    }
  }