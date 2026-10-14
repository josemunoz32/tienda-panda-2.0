const fs = require('fs');
const readline = require('readline');

const stream = fs.createReadStream('C:/Users/Usuario/.gemini/antigravity-ide/brain/8fa83837-1dbc-4f60-89bf-2c2db0bbae0b/.system_generated/logs/transcript.jsonl');
const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

const inputs = [];
rl.on('line', (line) => {
  try {
    const data = JSON.parse(line);
    if (data.type === 'USER_INPUT' || data.source === 'USER' || data.source === 'USER_EXPLICIT') {
      const text = typeof data.content === 'string' ? data.content : JSON.stringify(data.content || '');
      inputs.push({ step: data.step_index, content: text.slice(0, 300), created: data.created_at });
    }
  } catch (e) {}
});

rl.on('close', () => {
  console.log('Total user inputs:', inputs.length);
  inputs.slice(-25).forEach(i => {
    console.log('[' + i.step + '] ' + i.created + ': ' + i.content.replace(/\n/g, ' '));
  });
});
