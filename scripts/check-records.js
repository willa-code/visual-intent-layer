#!/usr/bin/env node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';

const STATUSES = [
  'needs-triage',
  'ready-for-agent',
  'ready-for-human',
  'deferred',
  'done',
  'superseded in part',
  'superseded',
  'wontfix'
];

const STATUS_LINE = /^[ \t]*\*{0,2}Status:\*{0,2}[ \t]*(.+?)[ \t]*$/m;
const TRIGGER_LINE = /^[ \t]*\*{0,2}Trigger:\*{0,2}[ \t]*(\S.*?)[ \t]*$/m;
const ISSUE_NAME = /^\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;

function parseArgs(argv) {
  let root = '.scratch';
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--root') {
      root = argv[index + 1] ?? root;
      index += 1;
    } else if (argv[index].startsWith('--root=')) {
      root = argv[index].slice('--root='.length);
    }
  }
  return { root: resolve(root) };
}

function walk(dir, records) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path, records);
      continue;
    }
    if (!entry.name.endsWith('.md')) {
      continue;
    }
    const isSpec = entry.name === 'spec.md';
    const isIssue = basename(dir) === 'issues';
    if (isSpec || isIssue) {
      records.push({ path, isSpec, isIssue });
    }
  }
}

function statusToken(value) {
  const cleaned = value.replace(/^`+|`+$/g, '').trim();
  return STATUSES.find((status) => cleaned === status || cleaned.startsWith(`${status} `));
}

function inspect(record, problems) {
  const text = readFileSync(record.path, 'utf8');
  const match = STATUS_LINE.exec(text);
  const name = relative(process.cwd(), record.path);

  if (record.isIssue && !ISSUE_NAME.test(basename(record.path))) {
    problems.push(`${name}: issue filename is not NN-<slug>.md`);
  }
  if (!match) {
    problems.push(`${name}: no Status line`);
    return;
  }
  const value = match[1].trim();
  const status = statusToken(value);
  if (!status) {
    problems.push(`${name}: unknown Status "${value}"`);
    return;
  }
  if (record.isIssue && status === 'done') {
    const unticked = text
      .split('\n')
      .filter((line) => /^[ \t]*-[ \t]*\[[ \t]\]/.test(line))
      .map((line) => line.replace(/^[ \t]*-[ \t]*\[[ \t]\][ \t]*/, '').trim());
    if (unticked.length > 0 && !text.includes('Deferred confirmation:')) {
      for (const box of unticked) {
        problems.push(`${name}: done with an unticked box and no Deferred confirmation: "${box}"`);
      }
    }
  }
  if (status === 'deferred') {
    const trigger = TRIGGER_LINE.exec(text);
    if (!trigger) {
      problems.push(`${name}: deferred with no Trigger line`);
    } else if (!/\d{4}-\d{2}-\d{2}/.test(trigger[1])) {
      problems.push(`${name}: deferred Trigger names no date`);
    }
  }
}

function main() {
  const { root } = parseArgs(process.argv.slice(2));
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
    console.error(`check-records: no records directory at ${root}`);
    process.exit(1);
  }
  const records = [];
  walk(root, records);
  const problems = [];
  for (const record of records) {
    inspect(record, problems);
  }
  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(`✗ ${problem}`);
    }
    console.error(`check-records: ${problems.length} problem(s) across ${records.length} record(s)`);
    process.exit(1);
  }
  console.log(`records OK: ${records.length} record(s) under ${relative(process.cwd(), root) || '.'}`);
}

main();
