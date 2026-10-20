# mcd-mcp-skills

基于麦当劳中国 MCP Server 的 5 个 Agent Skills 全家桶 —— 让任意支持 MCP 的 AI Agent（Claude Code / Kimi Code / Cursor / Trae / WorkBuddy 等）直接帮你点麦当劳：省钱凑单、营养搭配、派对预约、积分管理、定时自动领券，一个都不少。

> 麦当劳程序员创意开发大赛参赛作品。本项目为参赛者独立开发的开源项目，非麦当劳官方产品。

## 亮点

- **真实下单闭环**：不是 Demo——从找店、选品、试算到 `create-order` 真实下单，全程在对话里完成（下单前必须经你确认）
- **一键领券**：`auto-bind-coupons` 自动领光当前可领的券，再按门店盘点可用券做组合试算
- **官方营养数据**：160 项餐品的能量/蛋白质/脂肪/碳水/钠/钙全量数据，减脂控卡、健身高蛋白都能搭
- **派对预约**：生日派对/主题派对/麦麦体验营/品鉴会/读书会，五步引导完成场次预约
- **定时自动化**：零依赖 Node.js 脚本，每天自动领券 + 生成日报，支持企业微信/Bark/Server酱推送，可挂 launchd / cron / GitHub Actions

## 5 个 Skill 一览

| Skill | 一句话能力 | 典型工具链 |
|---|---|---|
| [mcd-saver](skills/mcd-saver/SKILL.md) | 省钱凑单引擎：预算+人数 → 多套方案试算比价 → 确认下单 | query-nearby-stores → auto-bind-coupons → query-store-coupons → query-meals → calculate-price → create-order |
| [mcd-nutritionist](skills/mcd-nutritionist/SKILL.md) | 营养点餐师：官方营养数据 × 在售清单取交集，按控卡/高蛋白/低钠目标搭配 | list-nutrition-foods × query-meals → calculate-price |
| [mcd-party-planner](skills/mcd-party-planner/SKILL.md) | 派对预约助手：活动→城市→门店→日期→场次五步引导预约 | mall-points-products → query-party-city → query-party-store → query-party-store-date → query-party-store-session → party-order-create |
| [mcd-points-manager](skills/mcd-points-manager/SKILL.md) | 积分管家：临期提醒、最值兑换推荐、积分抽奖、兑换记录 | query-my-account → mall-points-products → mall-create-order / draw-lottery |
| [mcd-auto-routine](skills/mcd-auto-routine/SKILL.md) | 定时自动化管家：每日自动领券 + Markdown 日报推送 | auto-bind-coupons → campaign-calendar → query-my-account → query-lottery-info |

## 快速开始

### 1. 申请 MCP Token

到麦当劳开放平台申请：https://open.mcd.cn/mcp

### 2. 配置 MCP Server

复制 `mcp-config.example.json` 为 `mcp-config.json`（已 gitignore），填入你的 Token；或设置环境变量 `MCD_MCP_TOKEN`，配置中使用占位符引用：

```json
{
  "mcpServers": {
    "mcd-mcp": {
      "type": "streamablehttp",
      "url": "https://mcp.mcd.cn",
      "headers": { "Authorization": "Bearer ${MCD_MCP_TOKEN}" }
    }
  }
}
```

### 3. 安装 Skills

把 `skills/` 目录下需要的 Skill 文件夹复制到你的 Agent skills 目录（如 `~/.claude/skills/`、`~/.agents/skills/` 或各 IDE 对应目录），重启 Agent 即可。

### 4. 试试这些自然语言指令

- **mcd-saver**：「两个人 60 块预算，帮我在人民广场附近的麦当劳凑一单最划算的，到店自取」
- **mcd-nutritionist**：「我在减脂，帮我在麦当劳搭一份不超过 500 大卡的午餐」
- **mcd-party-planner**：「想给孩子在上海办一场麦当劳生日派对，下周日，8 个人」
- **mcd-points-manager**：「看看我积分还有多少、会不会过期，帮我挑个最值的兑换」
- **mcd-auto-routine**：`MCD_MCP_TOKEN=xxx node skills/mcd-auto-routine/scripts/auto-routine.mjs --dry-run`

## 目标用户

- 想让 AI Agent 真正代办"点麦当劳"这件事的效率玩家
- 关注热量与营养摄入的健身/控卡人群
- 需要给孩子办生日派对、组织线下活动的家长和组织者
- 手握大量积分、不想让它过期浪费的麦当劳会员
- 想学习"如何为真实 MCP Server 编写生产级 Agent Skills"的开发者

## 目录结构

```
├── README.md                  # 本文件
├── CONTEST_DECLARATION.md     # 参赛声明
├── MCP_INTEGRATION.md         # MCP 接入说明与 35 个工具全景
├── mcp-config.example.json    # MCP 客户端配置示例（环境变量占位符）
├── LICENSE                    # MIT
└── skills/
    ├── mcd-saver/SKILL.md             # 省钱凑单引擎
    ├── mcd-nutritionist/SKILL.md      # 营养点餐师
    ├── mcd-party-planner/SKILL.md     # 派对预约助手
    ├── mcd-points-manager/SKILL.md    # 积分管家
    └── mcd-auto-routine/
        ├── SKILL.md                   # 定时自动化管家
        ├── scripts/auto-routine.mjs   # 零依赖定时脚本（Node.js >= 18）
        └── config.example.json        # 推送渠道配置示例
```

## 安全与护栏

- 所有写操作（`create-order`、`party-order-create`、`mall-create-order`、`draw-lottery`）在 Skills 中均设有"用户明确确认"红线
- Token 只允许通过环境变量注入；仓库内不包含任何真实凭证，`mcp-config.json`、`config.json`、`.env` 均已被 gitignore
- `auto-routine.mjs` 提供 `--dry-run` 只读模式，首次使用请先 dry-run 验证

## 合规声明

本项目为麦当劳程序员创意开发大赛参赛作品，由参赛者独立开发，**非麦当劳官方产品**。项目输出仅供参考，不构成医疗、营养或其他专业建议；餐品信息、价格、库存、活动及供应状态以麦当劳官方渠道的实时结果为准。完整声明见 [CONTEST_DECLARATION.md](CONTEST_DECLARATION.md)。

## License

[MIT](LICENSE)
