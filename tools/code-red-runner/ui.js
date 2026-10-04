import { Runner } from './client.js';
const runner = new Runner();
const source = document.querySelector('#source');
const output = document.querySelector('#result');
const run = document.querySelector('#run');
let sequence = 0;
try {
  const response = await fetch('/code-red-runner/fixture.json');
  if (!response.ok) throw Error('fixture');
  const fixture = await response.text();
  run.disabled = false;
  run.onclick = async () => {
    const current = ++sequence;
    output.textContent = 'Running…';
    const result = await runner.run(source.value, fixture);
    if (current === sequence) output.textContent = JSON.stringify(result, null, 2);
  };
  document.querySelector('#cancel').onclick = () => runner.cancel();
} catch {
  output.textContent = 'Could not load the fixture. Reload to try again.';
}
