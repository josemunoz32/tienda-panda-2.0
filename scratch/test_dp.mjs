import { spawnSync } from 'child_process';
import path from 'path';

const exe = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Deadpool\\Binaries\\DP.exe';
const dir = path.dirname(exe);

const res = spawnSync(exe, [], { cwd: dir, encoding: 'utf8' });
console.log('Status / ExitCode:', res.status);
console.log('Error:', res.error);
console.log('Stdout:', res.stdout);
console.log('Stderr:', res.stderr);
