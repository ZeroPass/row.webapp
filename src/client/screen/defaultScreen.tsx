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
          <div className="_1sectionbg">
    <div className="container w-container">
      <div className="div-block-3">
        <h1 className="heading distancetop">ROW - Recoverable Online Wallets</h1>
        <h4 className="subheading">A demo UI</h4>
        <div className="div-block-4">
          <div>
            <div className="form-block w-form">
              <form id="email-form-2" name="email-form-2" data-name="Email Form 2"><label htmlFor="AccountName" className="field-label">Account name</label>
			  <input type="text" className="field w-input" maxLength={256} name="AccountName" data-name="AccountName" placeholder="rowuseruser1" id="AccountName"></input>
			  <label htmlFor="DeviceName" className="field-label">Device name </label>
			  
			  <input type="text" className="field w-input" maxLength={256} name="DeviceName" data-name="DeviceName" placeholder="androidphone" id="DeviceName"></input>
			  
			  </form>
              <div className="w-form-done"></div>
              <div className="w-form-fail"></div>
            </div>
            <div className="w-row">
              <div className="column-3 w-col w-col-6">
                <a href="#" className="buttonapprove w-button">Aprove 1/2</a>
                <div className="text-block">propose + aprove1</div>
              </div>
              <div className="w-col w-col-6">
                <a href="#" className="buttonapprove w-button">Aprove 2/2</a>
                <div className="text-block">aprove2 + execute</div>
              </div>
            </div>
          </div>
          <div className="section-2">
            <div className="div-block-5">
              <a href="#" className="buttonadvanced w-button">Add device<br></br> ‍</a>
              <div className="text-block">first time only</div>
            </div>
            <div className="div-block-6">
              <a href="#" className="buttonadvanced proposal w-button">Cancel proposal</a>
              <div className="text-block">If you are getting errors</div>
            </div>
          </div>
        </div>
      </div>
      <div className="div-block-2"></div>
    </div>
  </div>
  <div className="section">
    <div className="w-container">
      <div className="w-form">
        <form id="email-form" name="email-form" data-name="Email Form"><textarea name="field" maxLength={5000} id="field" placeholder="Log" className="w-input"></textarea></form>
        <div className="w-form-done">
          <div>Thank you! Your submission has been received!</div>
        </div>
        <div className="w-form-fail">
          <div>Oops! Something went wrong while submitting the form.</div>
        </div>
      </div>
    </div>
    <div className="container3 w-container">
      <div className="columns w-row">
        <div className="column-2 w-col w-col-5 w-col-small-small-stack">
          <div className="div-block"></div>
        </div>
        <div className="column w-col w-col-7 w-col-small-small-stack">
          <h1 className="heading-copy">Recoverable Online Walets</h1>
          <p className="paragraph">ROW expands on WebAuthn for use and brings social recovery that empowers communities to secure themselves without trusting any intermediaries.<br></br>2 out of 2 multisig for usage- usually your Phone and PC.<br></br>2 out of 4 multisig for recovery- usually your Phone, Pc, Trusted friend1 Phone and Trusted friend2 Phone.<br></br>Does not require server to hold webauthn KeyIDs, ROW saves them on the EOSIO chain. ROW manages multisig on a custom multisig contract which allows future additions of RSA and other digital signature algorithms.</p>
          <a href="#" className="buttongithub w-button">Read more on GitHub</a>
        </div>
      </div>
    </div>
  </div>
  <div className="footer">
    <div className="container-2 w-container">
      <a href="mailto:zeropass@pm.me" className="footertext">ZeroPass</a>
    </div>
  </div>
  <script src="https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=60674b22440b5619b46b5feb" type="text/javascript" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0="></script>
  <script src="js/webflow.js" type="text/javascript"></script>
        </div>
      );
    }
  }