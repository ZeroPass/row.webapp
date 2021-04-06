#!/bin/bash
git submodule update --init --recursive
docker pull eosio/nodeos-webauthn:latest

# Frontend setup
yarn
rm -rf node_modules/eosjs 
(
    cd external/eosjs && yarn
)
yarn add file:external/eosjs