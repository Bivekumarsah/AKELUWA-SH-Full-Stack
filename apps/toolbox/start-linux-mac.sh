#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
exec sh website/pdf-reducer/run_linux_mac.sh --toolbox
