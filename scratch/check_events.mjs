import { execSync } from 'child_process';

try {
  const psCmd = `Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName='Application Error'} -MaxEvents 3 | Format-List TimeCreated, Message`;
  const out = execSync(`powershell -NoProfile -Command "${psCmd}"`, { encoding: 'utf8' });
  console.log(out);
} catch (e) {
  console.log('Error or no events:', e.message);
}
