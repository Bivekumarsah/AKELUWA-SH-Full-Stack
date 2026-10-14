import { register } from "node:module";

register("./worker-runtime-loader.mjs", import.meta.url);
