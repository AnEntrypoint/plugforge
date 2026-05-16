#!/bin/bash
cd C:/dev/rs-plugkit
cargo build --release --target wasm32-unknown-unknown --features wasm 2>&1
