---
name: mcd-auto-routine
description: 麦当劳定时自动化管家。当用户想定时自动领麦当劳优惠券、每天推送活动日历、监控积分临期、定时参加积分抽奖，或想搭建每日麦当劳日报/提醒时使用。内置零依赖 Node.js 脚本，支持企业微信/Bark/Server酱推送，可挂 launchd、cron 或 GitHub Actions。
---

# mcd-auto-routine 定时自动化管家

## 能力概述

提供一个零依赖的 Node.js CLI 脚本（`scripts/auto-routine.mjs`），通过 MCP Streamable HTTP 协议顺序执行「一键领券 → 活动日历 → 积分账户 → 抽奖信息」，汇总生成 Markdown 日报，可选推送到企业微信机器人 / Bark / Server酱。配合系统定时器或 GitHub Actions 实现"每天早上自动领券 + 推送日报"。

## 触发场景

- "帮我每天早上自动领麦当劳优惠券"
- "积分快过期了能不能提醒我？"
- "做一个麦当劳每日活动推送"
- "每天自动抽一次奖"

## 字段口径（与 mcd-points-manager 一致）

脚本解析接口数据时遵循以下约定，改动代码时不要破坏：

- **信封结构**：所有工具返回 `{ success, code, message, datetime, traceId, data }`，`success === true && code === 200` 才从 `data` 取值。脚本用 `if (!r?.success)` 统一判失败。
- **积分字段是 `string` 且可能带一位小数**（如 `"84.1"`、`"204.3"`）。脚本内一律经 `num()` 转数值、`fmt()` 输出，**禁止直接做字符串比较**（`"100" <= "84.1"` 会得到 `true`）。
- **`expiredPoint` 必须播报**：这是用户历史已流失的积分，只报可用余额会漏掉最重要的信息。
- **抽奖资格唯一依据** `drawDecision.resourceEligible` + `nextConsumption`。**不读 `availableTimes`**——纯积分规则（`drawTypeText === "消耗积分抽奖"`）下该字段整个不返回，缺失/0/null 都不代表不能抽。
- **奖励信息边界**：`prizes` 只有 `name`/`imageUrl`/`typeText`，**不含中奖概率和剩余库存**，日报不得暗示或估算。

## 快速开始

```bash
# 1. 设置 Token（到 https://open.mcd.cn/mcp 申请）
export MCD_MCP_TOKEN=<your-token>

# 2. 先跑只读模式验证（不领券、不抽奖）
node scripts/auto-routine.mjs --dry-run

# 3. 正式执行（领券 + 日报）
node scripts/auto-routine.mjs

# 4. 附加执行一次积分抽奖（消耗积分，慎用）
node scripts/auto-routine.mjs --draw
```

## 脚本行为与工具调用链

按顺序执行（任一失败不阻塞后续步骤，失败会记入日报"异常"小节）：

| 顺序 | 工具 | 类型 | 说明 |
|---|---|---|---|
| 1 | `auto-bind-coupons` | 写（领券） | `--dry-run` 时跳过 |
| 2 | `campaign-calendar` | 读 | 汇总今天起 10 天的活动 |
| 3 | `query-my-account` | 读 | 可用/累计/已用/历史已过期 + 临期提醒 |
| 4 | `query-lottery-info` | 读 | 活动状态、抽奖资格与本次消耗 |
| 5 | `draw-lottery` | 写（抽奖） | 仅 `--draw` 且非 dry-run **且通过资格护栏**时执行 |

**抽奖护栏（第 5 步的门槛）**：执行 `draw-lottery` 前，脚本会先用第 4 步的结果校验，任一不满足则跳过并在日报中写明原因、本次不消耗任何积分：

1. `status.code === "SUCCESS"`
2. `activityStatusText === "进行中"`
3. `drawDecision` 存在且 `resourceEligible === true`

> 护栏的意义：定时任务无人值守，若活动异常或资源不足还硬抽，会白白失败并可能触发风控。宁可跳过，也不在状态不明时消耗积分。

- Token 只从环境变量 `MCD_MCP_TOKEN` 读取，脚本内无任何硬编码密钥
- 401 → 明确提示重新申请 Token，退出码 2；429 → 自动等待 5 秒重试一次；网络错误 → 单步骤降级为失败条目
- 退出码：0 全部成功 / 1 致命错误（如无 Token、网络不通）/ 2 认证失败 / 3 部分步骤失败

## 推送配置

复制 `config.example.json` 为 `config.json`（与脚本同目录的上一级，或用 `--config`/`MCD_ROUTINE_CONFIG` 指定路径），开启需要的渠道，密钥通过环境变量提供：

```bash
export WECOM_WEBHOOK_URL="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxx"  # 企业微信机器人
export BARK_URL="https://api.day.app/your-device-key"                                  # Bark（iOS）
export SCTP_SENDKEY="SCTxxxxxxxx"                                                      # Server酱（微信）
```

不开启任何渠道时日报仅打印到 stdout，可直接重定向到文件或接入自己的通知管道。

## 定时方式

### 方式一：macOS launchd

新建 `~/Library/LaunchAgents/com.example.mcd-auto-routine.plist`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.example.mcd-auto-routine</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/absolute/path/to/skills/mcd-auto-routine/scripts/auto-routine.mjs</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>MCD_MCP_TOKEN</key><string>换成你的Token</string>
  </dict>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>30</integer></dict>
  <key>StandardOutPath</key><string>/tmp/mcd-auto-routine.log</string>
  <key>StandardErrorPath</key><string>/tmp/mcd-auto-routine.err</string>
</dict>
</plist>
```

加载：`launchctl load ~/Library/LaunchAgents/com.example.mcd-auto-routine.plist`
（每天 08:30 执行；更安全的方式是用 `security add-generic-password` 把 Token 存钥匙串再由 wrapper 脚本读出，避免明文写在 plist 里。）

### 方式二：Linux cron

```bash
crontab -e
# 每天 08:30 执行（Token 从独立的 env 文件读取，权限 600）
30 8 * * * set -a && . ~/.config/mcd-routine.env && set +a && /usr/bin/node /opt/mcd-mcp-skills/skills/mcd-auto-routine/scripts/auto-routine.mjs >> /var/log/mcd-routine.log 2>&1
```

`~/.config/mcd-routine.env` 内容（`chmod 600`）：

```bash
MCD_MCP_TOKEN=换成你的Token
WECOM_WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxx
```

### 方式三：GitHub Actions

在仓库 **Settings → Secrets and variables → Actions** 中创建 `MCD_MCP_TOKEN`（及可选的 `WECOM_WEBHOOK_URL` 等），然后新建 `.github/workflows/mcd-daily.yml`：

```yaml
name: mcd-daily-routine
on:
  schedule:
    - cron: '30 0 * * *'   # UTC 00:30 = 北京时间 08:30
  workflow_dispatch:        # 支持手动触发
jobs:
  routine:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Run daily routine
        env:
          MCD_MCP_TOKEN: ${{ secrets.MCD_MCP_TOKEN }}
          WECOM_WEBHOOK_URL: ${{ secrets.WECOM_WEBHOOK_URL }}
        run: node skills/mcd-auto-routine/scripts/auto-routine.mjs --config skills/mcd-auto-routine/config.json
```

> 注意：GitHub 托管 runner 上脚本仓库内若使用 `config.json`，请确保该文件只含渠道开关、不含任何密钥，且已被 `.gitignore` 排除。

## 关键约束与护栏

- **写操作明示**：`auto-bind-coupons`（领券）与 `draw-lottery`（消耗积分）均为写操作。首次部署务必先 `--dry-run` 验证，再上定时；`--draw` 默认关闭。
- **抽奖必须过资格护栏**：即使加了 `--draw`，状态异常或 `resourceEligible !== true` 时脚本也会跳过并说明原因。不得为此放宽判断去读 `availableTimes`。
- **数值先转换**：积分字段是带小数的字符串，任何比较/运算前必须经 `num()` 转换。
- **限流**：MCP 限流 600 次/分钟/Token，脚本每次运行仅 4~5 次调用，远低于上限；429 时自动退避重试一次。
- **密钥卫生**：Token 与推送密钥只允许出现在环境变量或本地 env 文件中，绝不写入脚本、配置示例或 git 仓库。

## 异常处理

| 情况 | 脚本行为 | 用户动作 |
|---|---|---|
| 未设 `MCD_MCP_TOKEN` | 打印设置指引，退出码 1 | 设置环境变量后重跑 |
| 401 Token 失效 | 提示重新申请，退出码 2 | 到 https://open.mcd.cn/mcp 换新 Token |
| 429 限流 | 5 秒后自动重试一次 | 仍失败则下次定时周期自然恢复 |
| 网络不通 | 该步骤记为失败条目，继续后续步骤 | 检查网络 |
| 推送失败 | stderr 记录，不影响日报生成 | 检查 webhook 地址/密钥 |

### 抽奖 `status.code` 分派

`query-lottery-info` 返回的 `status.code` 决定日报如何呈现抽奖小节：

| `status.code` | 日报呈现 | 是否可抽 |
|---|---|---|
| `SUCCESS` | 正常展示活动、资格、本次消耗 | 视 `resourceEligible` |
| `NOT_LOGIN` | 提示登录态失效，引导重新授权 | 否 |
| `NO_ACTIVITY` | 提示当前无可参与活动 | 否 |
| `ACTIVITY_ERROR` | 转述 `status.message`，建议稍后重试 | 否 |
| `ACTIVITY_EXPIRED` | 提示活动已结束，附活动起止时间 | 否 |

未知状态码原样转述 `status.message`，不自行归类。`draw-lottery` 失败时原样转述 `message` 并**不自动重试**。
