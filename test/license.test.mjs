import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const canonicalMit = `MIT License

Copyright (c) 2026 BSVS777

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

test('LICENSE is the unmodified canonical MIT grant for BSVS777', async () => {
  const license = await readFile(new URL('../LICENSE', import.meta.url), 'utf8');
  assert.equal(license, canonicalMit);
});

test('third-party notices separate project licensing from trademarks and bundled assets', async () => {
  const notice = await readFile(new URL('../THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8');
  assert.match(notice, /does not grant rights to third-party trademarks/i);
  assert.match(notice, /not affiliated with, sponsored by, or endorsed by FIFA/i);
  assert.match(notice, /does not bundle third-party font files/i);
  assert.match(notice, /MIT permits commercial and noncommercial use/i);
  assert.doesNotMatch(notice, /MIT[^.]*only[^.]*noncommercial|MIT[^.]*only[^.]*non-commercial/is);
});
