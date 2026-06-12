#!/usr/bin/env node
// pretty-log.mjs - Format Fastify/Pino JSON logs into a compact readable form.
// Reads JSON log lines from stdin, prints one formatted line per log entry to stdout.

const LEVELS = { 10: 'TRACE', 20: 'DEBUG', 30: 'INFO', 40: 'WARN', 50: 'ERROR', 60: 'FATAL' };

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

const LEVEL_COLORS = { TRACE: 'gray', DEBUG: 'gray', INFO: 'cyan', WARN: 'yellow', ERROR: 'red', FATAL: 'red' };

const isTTY = process.stdout.isTTY;
const c = (code, text) => (isTTY ? `${COLORS[code]}${text}${COLORS.reset}` : text);

function formatTime(timestamp) {
  if (!timestamp) return '??:??:??.???';
  const d = new Date(timestamp);
  return d.toISOString().slice(11, 23);
}

function formatStatus(code) {
  const color = code >= 500 ? 'red' : code >= 400 ? 'yellow' : 'green';
  return c(color, String(code));
}

function formatLine(log) {
  const level = LEVELS[log.level] || 'INFO';
  const time = c('dim', `[${formatTime(log.time)}]`);
  const lvl = c(LEVEL_COLORS[level] || 'reset', level.padEnd(5));
  const reqId = log.reqId ? c('magenta', `(${log.reqId})`) + ' ' : '';

  let detail = '';
  if (log.req && log.req.method) {
    detail = `${log.req.method} ${c('cyan', log.req.url || '')}`;
  } else if (log.res && typeof log.res.statusCode === 'number') {
    const status = formatStatus(log.res.statusCode);
    const rt = log.responseTime != null ? ` ${c('dim', `in ${log.responseTime.toFixed(0)}ms`)}` : '';
    detail = `${status}${rt}`;
  }

  const msg = log.msg || '';
  return detail ? `${time} ${lvl} ${reqId}${msg} ${detail}` : `${time} ${lvl} ${reqId}${msg}`;
}

let buffer = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      console.log(formatLine(JSON.parse(line)));
    } catch {
      process.stdout.write(line + '\n');
    }
  }
});

process.stdin.on('end', () => {
  if (buffer.trim()) {
    try {
      console.log(formatLine(JSON.parse(buffer)));
    } catch {
      process.stdout.write(buffer + '\n');
    }
  }
});
