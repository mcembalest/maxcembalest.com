import { build } from 'esbuild';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
const output = 'public/code-red-runner';
await mkdir(output, { recursive: true });
await build({ entryPoints: ['tools/code-red-runner/worker.js', 'tools/code-red-runner/client.js', 'tools/code-red-runner/ui.js', 'tools/code-red-runner/mailbox.js'], bundle: true, format: 'esm', platform: 'browser', outdir: output, target: 'es2022' });
await copyFile('node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.wasm', `${output}/emscripten-module.wasm`);
await copyFile('tools/code-red-runner/fixture.json', `${output}/fixture.json`);
await writeFile(`${output}/LICENSES.txt`, await readFile('node_modules/@jitl/quickjs-wasmfile-release-sync/LICENSE', 'utf8'));
