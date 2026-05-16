#!/bin/bash
cd C:/dev/rs-plugkit
cargo check 2>&1 | tail -100
