# ROW - Recoverable Online Wallets 

## Overview
The ROW project is extended project of [EOSIO Webautn App](https://github.com/EOSIO/eosio-webauthn-example-app/). The code is running only on client side (browser). Server is used only to host a server for https connection. Webauthn protocol must be operated with https connection (security reason).


## Building and Running The App
Running this app will create an HTTP server listening on `0.0.0.0:443` meaning it would typically be accessible via `https://<domain_name>` However, WebAuthn requires usage from an HTTPS origin. You will need to place an HTTPS proxy in front of the server and modify server source code with the resulting domain name and port.

### Running Locally With nodeos Docker Image

#### Prerequisites
- Installed HAProxy
   - On Mac: `brew install haproxy`
   - On Ubuntu: `apt-get install haproxy=1.8.\*`
- Installed nodejs, npm and yarn

#### Setup
To install nodejs, npm and yarn run:

`sudo apt update && sudo apt upgrade`

Configure repository(node and npm)

`sudo apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates && curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -`

Install

`sudo apt -y install nodejs`


Configure repository(yarn)

`curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add - && echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list`

Install yarn

`sudo apt update && sudo apt install yarn`

Install/setup repository

`yarn setup`

#### HTTPS proxy via self-signed localhost certificate:

The following describes one way of placing an HTTPS proxy in front of the server via the program `haproxy` along with a self-signed certificate that you instruct your browser to trust.

#### Create a certificate and private key:

```
$ openssl req \
-x509 \
-nodes \
-new \
-newkey rsa:4096 \
-keyout localhostca.key \
-out localhostca.crt \
-sha256 \
-days 3650 \
-config <(cat <<EOF

[ req ]
prompt = no
distinguished_name = subject
x509_extensions    = x509_ext

[ subject ]
commonName = localhost

[ x509_ext ]
subjectAltName = @alternate_names
basicConstraints=CA:TRUE,pathlen:0

[ alternate_names ]
DNS.1 = localhost

EOF
)
```

#### Combine the .cert file and the .key into a .pem file:

```
$ cat localhostca.crt localhostca.key > localhostca.pem
```

#### Make a haproxy.cfg file which will listen on HTTPS port 7000 and forward to port 8000:

```
defaults
   timeout connect 10000ms
   timeout client  50000ms
   timeout server  50000ms

frontend https-in
   bind *:7000 ssl crt localhostca.pem
   use_backend http_backend

backend http_backend
   server server1 127.0.0.1:8000
```

#### Modification of server origin in source:

The server domain name and port must be specified in the source of this application. Modify the `socketUrl` in `src/client/ClientRoot.tsx` to be the valid HTTPS url to the HTTPS proxy. If you performed the self-signed & haproxy instructions above you would change this to `https://<domainName>`

#### Starting/Stopping
To start the haproxy, and the app:
`yarn server`

## License

[MIT](./LICENSE)
should work with this software.
