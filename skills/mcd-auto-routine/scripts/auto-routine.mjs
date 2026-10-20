#!/usr/bin/env node
/**
 * mcd-auto-routine — 麦当劳中国 MCP 定时自动化脚本
 *
 * 零依赖（Node.js >= 18，仅使用全局 fetch）。
 * 通过 MCP Streamable HTTP 协议顺序调用：
 *   auto-bind-coupons -> campaign-calendar -> query-my-account -> query-lottery-info
 * 汇总输出 Markdown 日报，可选推送到企业微信机器人 / Bark / Server酱。
 *
 * 用法：
 *   MCD_MCP_TOKEN=<token> node auto-routine.mjs [--dry-run] [--draw] [--config <path>]
 *
 *   --dry-run   只读模式：跳过 auto-bind-coupons 与 draw-lottery 等写操作
 *   --draw      在展示抽奖消耗后自动执行一次 draw-lottery（写操作，消耗积分/次数）
 *   --config    推送配置文件路径（默认读取 MCD_ROUTINE_CONFIG 或脚本旁的 config.json）
 *
 * Token 只从环境变量 MCD_MCP_TOKEN 读取，禁止硬编码。
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ENDPOINT = 'https://mcp.mcd.cn';
const TOKEN = process.env.MCD_MCP_TOKEN;
const RETRY_DELAY_MS = 5000;

const args = process.argv.slice(2);
const flags = {
  dryRun: args.includes('--dry-run'),
  draw: args.includes('--draw'),
  configPath: getArgValue('--config') || process.env.MCD_ROUTINE_CONFIG || null,
  help: args.includes('--help') || args.includes('-h'),
};

function getArgValue(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

if (flags.help) {
  console.log('用法: MCD_MCP_TOKEN=<token> node auto-routine.mjs [--dry-run] [--draw] [--config <path>]');
  process.exit(0);
}

if (!TOKEN) {
  console.error('[错误] 未设置环境变量 MCD_MCP_TOKEN。');
  console.error('请到 https://open.mcd.cn/mcp 申请 Token，然后：');
  console.error('  export MCD_MCP_TOKEN=<your-token>');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 配置文件（可选）：仅控制推送渠道开关，密钥一律从环境变量读取
// ---------------------------------------------------------------------------
function loadConfig() {
  const candidates = [];
  if (flags.configPath) candidates.push(flags.configPath);
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  candidates.push(join(scriptDir, '..', 'config.json'));
  for (const p of candidates) {
    if (p && existsSync(p)) {
      try {
        return { path: p, config: JSON.parse(readFileSync(p, 'utf8')) };
      } catch (e) {
        console.error(`[警告] 配置文件 ${p} 解析失败，已忽略：${e.message}`);
      }
    }
  }
  return { path: null, config: {} };
}

// ---------------------------------------------------------------------------
// 最小 MCP Streamable HTTP Client
// ---------------------------------------------------------------------------
class McpClient {
  constructor(endpoint, token) {
    this.endpoint = endpoint;
    this.token = token;
    this.sessionId = null;
    this.nextId = 1;
  }

  headers() {
    const h = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    };
    if (this.sessionId) h['Mcp-Session-Id'] = this.sessionId;
    return h;
  }

  async rpc(method, params, { allowRetry = true } = {}) {
    const body = JSON.stringify({ jsonrpc: '2.0', id: this.nextId++, method, params });
    let res;
    try {
      res = await fetch(this.endpoint, { method: 'POST', headers: this.headers(), body });
    } catch (e) {
      throw new Error(`网络错误：${e.message}`);
    }
    const sid = res.headers.get('mcp-session-id');
    if (sid) this.sessionId = sid;

    if (res.status === 401) {
      const err = new Error('401 Unauthorized：Token 无效或已过期，请到 https://open.mcd.cn/mcp 重新申请并更新 MCD_MCP_TOKEN。');
      err.status = 401;
      throw err;
    }
    if (res.status === 429) {
      if (allowRetry) {
        console.error(`[限流] 429 Too Many Requests，${RETRY_DELAY_MS / 1000}s 后重试一次…`);
        await sleep(RETRY_DELAY_MS);
        return this.rpc(method, params, { allowRetry: false });
      }
      const err = new Error('429 Too Many Requests：已超过 600 次/分钟 限流，请稍后重试。');
      err.status = 429;
      throw err;
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}：${text.slice(0, 300)}`);
    }

    const contentType = res.headers.get('content-type') || '';
    const payload = contentType.includes('text/event-stream')
      ? parseSse(await res.text())
      : await res.json();
    if (!payload) throw new Error('响应为空或无法解析');
    if (payload.error) {
      throw new Error(`JSON-RPC 错误 ${payload.error.code}：${payload.error.message}`);
    }
    return payload.result;
  }

  async initialize() {
    const result = await this.rpc('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'mcd-auto-routine', version: '1.0.0' },
    });
    // initialized 通知（无 id），失败不阻塞主流程
    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      });
    } catch { /* 忽略 */ }
    return result;
  }

  async callTool(name, argsObj = {}) {
    const result = await this.rpc('tools/call', { name, arguments: argsObj });
    if (result?.structuredContent) return result.structuredContent;
    const text = result?.content?.[0]?.text || '';
    const m = text.match(/## Original Response\n\n([\s\S]*)$/);
    if (m) {
      try { return JSON.parse(m[1]); } catch { /* fallthrough */ }
    }
    return { rawText: text };
  }
}

function parseSse(raw) {
  let last = null;
  for (const line of raw.split('\n')) {
    if (line.startsWith('data:')) {
      const data = line.slice(5).trim();
      if (data && data !== '[DONE]') {
        try { last = JSON.parse(data); } catch { /* 忽略心跳行 */ }
      }
    }
  }
  return last;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// 各数据源的 Markdown 摘要
// ---------------------------------------------------------------------------
function summarizeCoupons(r, { skipped } = {}) {
  if (skipped) return '> 本次为 `--dry-run` 只读模式，已跳过一键领券。\n';
  if (!r?.success) return `> 领券失败：${r?.message || JSON.stringify(r).slice(0, 200)}\n`;
  const d = r.data;
  const lines = [];
  const names = [];
  if (Array.isArray(d)) {
    for (const c of d) names.push(c.couponName || c.title || c.name || JSON.stringify(c).slice(0, 60));
  } else if (d && typeof d === 'object') {
    for (const k of Object.keys(d)) {
      const v = d[k];
      if (Array.isArray(v)) for (const c of v) names.push(c.couponName || c.title || c.name || JSON.stringify(c).slice(0, 60));
    }
  }
  if (names.length) {
    lines.push(`成功领取 **${names.length}** 张券：`);
    for (const n of names) lines.push(`- ${n}`);
  } else {
    lines.push('领券完成，暂无新券或当前券均已领取。');
  }
  return lines.join('\n') + '\n';
}

function summarizeCalendar(r) {
  if (!r?.success) return `> 活动日历查询失败：${r?.message || '未知错误'}\n`;
  const daily = r.data?.dailyList || [];
  const today = r.data?.currentTime?.slice(0, 10);
  const lines = [];
  const upcoming = daily.filter((d) => d.date >= today && d.events?.length);
  if (!upcoming.length) return '> 近期暂无活动安排。\n';
  for (const day of upcoming.slice(0, 10)) {
    const titles = day.events
      .map((e) => e.articleDto?.title || e.activityTitle)
      .filter(Boolean);
    if (!titles.length) continue;
    const shown = titles.slice(0, 6);
    const more = titles.length > shown.length ? ` 等 ${titles.length} 项` : '';
    lines.push(`- **${day.date}**${day.today ? '（今天）' : ''}：${shown.join('；')}${more}`);
  }
  return lines.length ? lines.join('\n') + '\n' : '> 近期暂无活动安排。\n';
}

function summarizeAccount(r) {
  if (!r?.success) return `> 积分账户查询失败：${r?.message || '未知错误'}\n`;
  const d = r.data || {};
  const lines = [
    `- 可用积分：**${d.availablePoint ?? '-'}**`,
    `- 累计获得：${d.accumulativePoint ?? '-'}`,
  ];
  const cur = parseFloat(d.currentMouthExpirePoint ?? d.currentMonthExpirePoint ?? '0');
  const next = parseFloat(d.nextMouthExpirePoint ?? d.nextMonthExpirePoint ?? '0');
  if (cur > 0) lines.push(`- ⚠️ 本月即将过期：**${cur}** 积分，请尽快使用！`);
  if (next > 0) lines.push(`- 下月将过期：${next} 积分`);
  if (!(cur > 0) && !(next > 0)) lines.push('- 近期无临期积分 ✅');
  return lines.join('\n') + '\n';
}

function summarizeLottery(r) {
  if (!r?.success) return `> 抽奖活动查询失败：${r?.message || '未知错误'}\n`;
  const d = r.data || {};
  if (d.activityStatusText && d.activityStatusText !== '进行中') {
    return `> 当前无进行中的抽奖活动（${d.activityStatusText}）。\n`;
  }
  const lines = [
    `- 活动：${d.activityName || '-'}（${d.beginTime || '?'} ~ ${d.endTime || '?'}）`,
    `- 规则：${d.drawTypeText || '-'}，单次消耗 ${d.drawPoint ?? '-'} 积分`,
    `- 当前可用积分：${d.availablePoint ?? '-'}`,
  ];
  if (d.drawDecision) {
    lines.push(`- 抽奖资格：${d.drawDecision.resourceEligible ? '✅ 可参与' : '❌ 暂不可参与'}`);
    if (d.drawDecision.nextConsumption?.text) {
      lines.push(`- 下次消耗：${d.drawDecision.nextConsumption.text}`);
    }
  }
  const prizes = (d.prizes || []).map((p) => p.name).filter(Boolean);
  if (prizes.length) lines.push(`- 奖池：${prizes.join('、')}`);
  return lines.join('\n') + '\n';
}

function summarizeDraw(r) {
  if (!r?.success) return `> 抽奖执行失败：${r?.message || JSON.stringify(r).slice(0, 200)}\n`;
  const d = r.data || {};
  const name = d.prizeName || d.name || d.prize?.name;
  return name ? `🎉 本次抽中：**${name}**\n` : `🎉 抽奖完成：${JSON.stringify(d).slice(0, 200)}\n`;
}

// ---------------------------------------------------------------------------
// 推送渠道
// ---------------------------------------------------------------------------
async function pushWecom(markdown) {
  const url = process.env.WECOM_WEBHOOK_URL;
  if (!url) return '跳过（未设置 WECOM_WEBHOOK_URL）';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgtype: 'markdown', markdown: { content: markdown.slice(0, 4000) } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return '已推送';
}

async function pushBark(markdown, title) {
  const base = process.env.BARK_URL;
  if (!base) return '跳过（未设置 BARK_URL）';
  const res = await fetch(base.replace(/\/$/, '') + '/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body: markdown, group: 'mcd-auto-routine' }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return '已推送';
}

async function pushServerChan(markdown, title) {
  const key = process.env.SCTP_SENDKEY;
  if (!key) return '跳过（未设置 SCTP_SENDKEY）';
  const res = await fetch(`https://sctapi.ftqq.com/${key}.send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ title, desp: markdown }).toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return '已推送';
}

async function pushAll(markdown, config) {
  const pushCfg = config.push || {};
  const channels = [
    ['wecom', '企业微信机器人', pushWecom],
    ['bark', 'Bark', pushBark],
    ['serverchan', 'Server酱', pushServerChan],
  ];
  const results = [];
  for (const [key, label, fn] of channels) {
    if (!pushCfg[key]?.enabled) continue;
    try {
      results.push(`${label}：${await fn(markdown, '麦当劳每日播报')}`);
    } catch (e) {
      results.push(`${label}：推送失败（${e.message}）`);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
async function main() {
  const startedAt = new Date();
  const { config } = loadConfig();
  const client = new McpClient(ENDPOINT, TOKEN);

  console.error(`[mcd-auto-routine] 开始执行${flags.dryRun ? '（dry-run 只读模式）' : ''}…`);
  await client.initialize();

  const sections = [];
  const failures = [];

  // 1. 一键领券（写操作，dry-run 跳过）
  if (flags.dryRun) {
    sections.push(['🎫 一键领券', summarizeCoupons(null, { skipped: true })]);
  } else {
    try {
      sections.push(['🎫 一键领券', summarizeCoupons(await client.callTool('auto-bind-coupons'))]);
    } catch (e) {
      failures.push(`auto-bind-coupons: ${e.message}`);
      sections.push(['🎫 一键领券', `> 调用失败：${e.message}\n`]);
      if (e.status === 401) return finish(sections, failures, config, 2);
    }
  }

  // 2. 活动日历 / 3. 积分账户 / 4. 抽奖信息（只读）
  const readonlySteps = [
    ['campaign-calendar', '📅 本月活动日历', summarizeCalendar],
    ['query-my-account', '💰 积分账户', summarizeAccount],
    ['query-lottery-info', '🎰 积分抽奖', summarizeLottery],
  ];
  for (const [tool, title, summarize] of readonlySteps) {
    try {
      sections.push([title, summarize(await client.callTool(tool))]);
    } catch (e) {
      failures.push(`${tool}: ${e.message}`);
      sections.push([title, `> 调用失败：${e.message}\n`]);
      if (e.status === 401) return finish(sections, failures, config, 2);
    }
  }

  // 5. 可选：执行抽奖（写操作）
  if (flags.draw && !flags.dryRun) {
    try {
      sections.push(['🎉 抽奖结果', summarizeDraw(await client.callTool('draw-lottery'))]);
    } catch (e) {
      failures.push(`draw-lottery: ${e.message}`);
      sections.push(['🎉 抽奖结果', `> 调用失败：${e.message}\n`]);
    }
  } else if (flags.draw && flags.dryRun) {
    sections.push(['🎉 抽奖结果', '> `--dry-run` 模式下跳过 draw-lottery。\n']);
  }

  return finish(sections, failures, config, 0, startedAt);
}

async function finish(sections, failures, config, exitCode, startedAt = new Date()) {
  const dateStr = startedAt.toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' });
  const parts = [`# 麦当劳每日播报（${dateStr}）`];
  if (flags.dryRun) parts.push('> 本报告由 `--dry-run` 只读模式生成。');
  for (const [title, body] of sections) parts.push(`\n## ${title}\n\n${body}`);
  if (failures.length) parts.push(`\n## ⚠️ 异常\n\n${failures.map((f) => `- ${f}`).join('\n')}\n`);
  const report = parts.join('\n');

  console.log(report);

  const pushResults = await pushAll(report, config);
  for (const r of pushResults) console.error(`[推送] ${r}`);
  if (failures.length && exitCode === 0) exitCode = 3;
  process.exit(exitCode);
}

main().catch((e) => {
  console.error(`[致命错误] ${e.message}`);
  process.exit(e.status === 401 ? 2 : 1);
});
