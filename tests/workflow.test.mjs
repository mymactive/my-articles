import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, readFile, readdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const cliPackage = require.resolve('zenn-cli/package.json');
const cli = resolve(dirname(cliPackage), require(cliPackage).bin.zenn);
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));

// These scripts deliberately use simple CLI arguments, with no shell pipeline.
function cliArgs(script) {
  const [command, ...args] = pkg.scripts[script].split(/\s+/);
  assert.equal(command, 'zenn');
  return args;
}

async function contentHashes() {
  const hashes = {};
  for (const directory of ['articles', 'books', 'images']) {
    for (const entry of await readdir(join(root, directory), { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const path = join(entry.parentPath, entry.name);
      hashes[path] = createHash('sha256').update(await readFile(path)).digest('hex');
    }
  }
  return hashes;
}

test('new:article creates an unpublished draft and preserves an existing draft', async (t) => {
  const temporary = await mkdtemp(join(tmpdir(), 'article-draft-test-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  await mkdir(join(temporary, 'articles'));
  const args = [...cliArgs('new:article'), '--slug', 'workflow-smoke-test', '--title', 'テスト用の下書き'];
  const options = { cwd: temporary, encoding: 'utf8', timeout: 15_000 };
  const result = spawnSync(process.execPath, [cli, ...args], options);
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  const path = join(temporary, 'articles/workflow-smoke-test.md');
  const original = await readFile(path, 'utf8');
  assert.match(original, /^published: false$/m);
  assert.match(original, /^title: "テスト用の下書き"$/m);
  spawnSync(process.execPath, [cli, ...args, '--title', '上書きしない'], options);
  assert.equal(await readFile(path, 'utf8'), original);
});

test('preview serves every article and book chapter without changing content', { timeout: 60_000 }, async (t) => {
  const before = await contentHashes();
  const temporary = await mkdtemp(join(tmpdir(), 'article-preview-test-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const { port } = reservation.address();
  await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));
  const child = spawn(process.execPath, [cli, ...cliArgs('preview'), '--no-watch', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: root,
    env: { ...process.env, XDG_CONFIG_HOME: temporary },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let spawnError;
  child.on('error', (error) => { spawnError = error; });
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, 'close');
      child.kill();
      const force = setTimeout(() => child.kill('SIGKILL'), 3_000);
      await closed;
      clearTimeout(force);
    }
  });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    assert.equal(spawnError, undefined);
    assert.equal(child.exitCode, null, output);
    try {
      if ((await fetch(base, { signal: AbortSignal.timeout(1_000) })).ok) {
        ready = true;
        break;
      }
    } catch { /* Wait for the local server to listen. */ }
    await delay(100);
  }
  assert.ok(ready, `Preview did not start:\n${output}`);
  async function get(path) {
    const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(10_000) });
    assert.equal(response.status, 200, `${path}\n${output}`);
    return response.json();
  }
  const { articles } = await get('/api/articles');
  const articleFiles = (await readdir(join(root, 'articles'))).filter((name) => name.endsWith('.md'));
  assert.deepEqual(articles.map(({ slug }) => `${slug}.md`).sort(), articleFiles.sort());
  for (const { slug } of articles) {
    const { article } = await get(`/api/articles/${slug}`);
    assert.equal(article.slug, slug);
    assert.equal(typeof article.published, 'boolean');
    assert.equal(typeof article.bodyHtml, 'string');
  }
  const { books } = await get('/api/books');
  const bookDirectories = (await readdir(join(root, 'books'), { withFileTypes: true })).filter((entry) => entry.isDirectory());
  assert.deepEqual(books.map(({ slug }) => slug).sort(), bookDirectories.map(({ name }) => name).sort());
  let chapterCount = 0;
  for (const { slug } of books) {
    const { book } = await get(`/api/books/${slug}`);
    const { chapters } = await get(`/api/books/${slug}/chapters`);
    assert.equal(typeof book.published, 'boolean');
    if (book.specifiedChapterSlugs?.length) {
      assert.deepEqual(chapters.map(({ slug }) => slug), book.specifiedChapterSlugs);
    }
    for (const { filename } of chapters) {
      const { chapter } = await get(`/api/books/${slug}/chapters/${filename}`);
      assert.equal(typeof chapter.bodyHtml, 'string');
      chapterCount++;
    }
  }
  assert.deepEqual(await contentHashes(), before);
  t.diagnostic(`Rendered ${articles.length} articles, ${books.length} books, ${chapterCount} chapters; content unchanged.`);
});

test('textlint loads the configured JTF rules and reports a known style finding', () => {
  const textlintPackage = require.resolve('textlint/package.json');
  const textlint = resolve(dirname(textlintPackage), require(textlintPackage).bin.textlint);
  const result = spawnSync(process.execPath, [textlint, '--stdin', '--stdin-filename', 'smoke.md', '--format', 'json'], {
    cwd: root,
    encoding: 'utf8',
    input: 'これはテストです.\n',
    timeout: 15_000,
  });
  assert.equal(result.status, 1, result.error?.message ?? result.stderr);
  // A missing/disabled config can also return 1, but cannot produce this finding.
  const results = JSON.parse(result.stdout);
  assert.ok(results.some(({ messages }) => messages.some(({ ruleId }) => ruleId.startsWith('jtf-style/'))));
});
