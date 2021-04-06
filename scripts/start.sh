#!/bin/bash
haproxy -f haproxy-webauthn.cfg &> haproxy.log &
yarn server
