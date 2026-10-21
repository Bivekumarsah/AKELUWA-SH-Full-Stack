#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
exec sh ../../services/pdf-engine/run_linux_mac.sh --toolbox
