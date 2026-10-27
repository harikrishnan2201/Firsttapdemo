/**
 * Retry render for remaining diagrams
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');
const outDir = path.join(__dirname, '..', 'images');
fs.mkdirSync(outDir, { recursive: true });

const files = [
  { src: '01-system-architecture.mmd', out: 'architecture-overview.svg' },
  { src: '04-deployment.mmd',           out: 'deployment.svg' },
  { src: '05-lesson-sequence.mmd',      out: 'lesson-sequence.svg' },
];

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'FirstTap-docs/1.0' }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`  Retry ${i+1}...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

for (const { src, out } of files) {
  const mmd = fs.readFileSync(path.join(srcDir, src), 'utf8');
  const b64 = Buffer.from(mmd).toString('base64url');
  const url = `https://mermaid.ink/svg/${b64}`;

  console.log(`Fetching ${out}...`);
  try {
    const svg = await fetchWithRetry(url);
    fs.writeFileSync(path.join(outDir, out), svg, 'utf8');
    console.log(`  ✅ Saved docs/images/${out} (${svg.length} bytes)`);
  } catch (err) {
    console.error(`  ❌ Failed ${out}: ${err.message}`);
  }
}
console.log('\nDone.');
