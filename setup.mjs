import {randomBytes} from 'node:crypto';
import {writeFileSync,existsSync} from 'node:fs';
const path=new URL('./connection.json',import.meta.url);
if(!existsSync(path))writeFileSync(path,JSON.stringify({token:randomBytes(32).toString('hex')},null,2),{mode:0o600});
console.log('Local pairing file ready. Keep connection.json private; enter its token only in the extension options.');
