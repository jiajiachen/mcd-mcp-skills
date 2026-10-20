# WorkBuddy 开发对话上下文（workbuddy.md）

本文件为参赛项目使用腾讯 WorkBuddy 辅助开发的对话导出记录，用于「WorkBuddy 专项奖励」核验。


## 🧑 用户（2026/10/20 18:29:21）

<user_query>我正在开发一组基于麦当劳 MCP 的 Agent Skill（就在当前工作空间的 skills/ 目录下）。请帮我验证 skills/mcd-points-manager/SKILL.md 中写的工具调用链是否正确：请先读取该文件，然后实际调用 mcd-mcp 连接器的 query-my-account 查询我的积分账户、调用 query-lottery-info 查询当前积分抽奖活动，把真实返回结果和 SKILL.md 里的字段与流程描述逐一对比，指出不一致之处并给出修改建议。只做查询类只读调用，不要下单或抽奖。</user_query>

## 🤖 WorkBuddy（2026/10/20 18:29:30）

我来先读取 SKILL.md，然后实际调用查询接口做对比验证。

> 🔧 调用工具 `Read`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-points-manager/SKILL.md"}

> 🔧 调用工具 `Bash`：{"command": "ls -la /Users/jiachen/Projects/kimiPrj/prj24/skills/ && echo \"---\" && ls -la /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-points-manager/", "description": "查看 skills 目录结构"}
> ✅ `Read` 返回（completed）： 1→--- 2→name: mcd-points-manager 3→description: 麦当劳积分管家。当用户查询积分余额、积分快过期、想用积分兑换商品/餐券、查看积分商城、参加积分抽奖、查看抽奖奖品或兑换记录时使用。覆盖积分账户盘点、临期积分兑换推荐、抽奖、订单查询全流程。 4→---  …（截断）
> ✅ `Bash` 返回（completed）：Command: ls -la /Users/jiachen/Projects/kimiPrj/prj24/skills/ && echo "---" && ls -la /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-points-manager/ …（截断）

## 🤖 WorkBuddy（2026/10/20 18:29:34）

SKILL.md 已读完。现在加载 mcd-mcp 的查询工具并实际调用。

> 🔧 调用工具 `ToolSearch`：{"tool_names": ["mcp__mcd-mcp__query-my-account", "mcp__mcd-mcp__query-lottery-info", "mcp__mcd-mcp__query-my-prizes", "mcp__mcd-mcp__mall-points-products"]}
> ✅ `ToolSearch` 返回（completed）：Found 4 tool(s). Use DeferExecuteTool to invoke them. ## mcp__mcd-mcp__query-my-account 查询用户积分账户详情 - 当用户询问"我有多少积分"、"查下我的积分"、"积分余额"、"查询过期积分"时使用 Paramet …（截断）

> 🔧 调用工具 `DeferExecuteTool`：{"toolName": "mcp__mcd-mcp__query-my-account", "params": {}}

> 🔧 调用工具 `DeferExecuteTool`：{"toolName": "mcp__mcd-mcp__query-lottery-info", "params": {}}
> ✅ `DeferExecuteTool` 返回（completed）：# API Response Information Below is the response from an API call. To help you understand the data, I've provided: 1. A detailed description of all fi …（截断）
> ✅ `DeferExecuteTool` 返回（completed）：# API Response Information Below is the response from an API call. To help you understand the data, I've provided: 1. A detailed description of all fi …（截断）

## 🤖 WorkBuddy（2026/10/20 18:29:51）

账户和抽奖接口都已返回真实数据。SKILL.md 第 3、4 步还有 `point`/`price` 字段和筛选类的具体断言，我补一次只读的商品列表校验。

> 🔧 调用工具 `DeferExecuteTool`：{"params": {"catRuleIds": "1>4,2"}, "toolName": "mcp__mcd-mcp__mall-points-products"}

> 🔧 调用工具 `ToolSearch`：{"tool_names": ["mcp__mcd-mcp__mall-product-detail", "mcp__mcd-mcp__query-my-coupons", "mcp__mcd-mcp__mall-order-list"]}
> ✅ `DeferExecuteTool` 返回（completed）：# API Response Information Below is the response from an API call. To help you understand the data, I've provided: 1. A detailed description of all fi …（截断）
> ✅ `ToolSearch` 返回（completed）：Found 3 tool(s). Use DeferExecuteTool to invoke them. ## mcp__mcd-mcp__mall-product-detail 查询积分兑换商品详情 - 当用户询问"这个商品详情是什么"、"查看商品详细信息"、用户点击商品查看详情时使用 返回商品 …（截断）

## 🤖 WorkBuddy（2026/10/20 18:30:06）

三个只读调用都拿到了真实数据，问题比预想的多——其中两条会直接导致推荐出错。先记录一下工作日志。

> 🔧 调用工具 `Bash`：{"command": "mkdir -p /Users/jiachen/Projects/kimiPrj/prj24/.workbuddy/memory && ls -la /Users/jiachen/Projects/kimiPrj/prj24/.workbuddy/memory/", "description": "检查 memory 目录"}
> ✅ `Bash` 返回（completed）：Command: mkdir -p /Users/jiachen/Projects/kimiPrj/prj24/.workbuddy/memory && ls -la /Users/jiachen/Projects/kimiPrj/prj24/.workbuddy/memory/ Stdout: t …（截断）

> 🔧 调用工具 `Write`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/.workbuddy/memory/2026-10-20.md", "content": "# 2026-10-20\n\n## 验证 mcd-points-manager SKILL.md 工具调用链（只读）\n\n调用 mcd-mcp 的 query-my-account / query- …（截断）
> ✅ `Write` 返回（completed）：Successfully created and wrote to new file: /Users/jiachen/Projects/kimiPrj/prj24/.workbuddy/memory/2026-10-20.md

## 🤖 WorkBuddy（2026/10/20 18:30:23）

验证做完了，结论是：**字段名基本对得上，但两条流程逻辑有实质性 bug** —— 按现在的 SKILL.md 执行，推荐出来的东西是错的。

## 实测调用结果

| 工具 | 结果 |
|---|---|
| `query-my-account` | availablePoint **84.1**、accumulative **296.4**、used **8**、expired **204.3**、本月/下月过期均 **0** |
| `query-lottery-info` | "麦麦积分抽奖" 进行中（至 2030-12-31），drawPoint **24**，`drawDecision.resourceEligible=true`，`nextConsumption.text="本次将消耗 24 积分"`，10 个奖品 |
| `mall-points-products`（额外做的只读校验） | 27 条，`price` 全部为 `"0"`，18 条已过 `downTime` |

## ❌ 两个必须修的逻辑错误

**1. 「积分价值比 = price ÷ point」完全失效（第 4 步）**

`price` 的真实含义是字段说明里的「**所需金额**」，不是商品面值，实测 27 条全是 `"0"`。所以每个商品的比值都会算成 `0 ÷ point = 0`，全表并列，排序毫无意义，Top 3 变成随机取三条。

真实面值只存在于 `spuName` 文案里（如「18.8元2份麦辣鸡翅」「21.9元巨无霸可乐组合」），需要从名称正则提取数字；`selling` 字段可作兜底。建议改成：面值 ← 从 `spuName` 解析 → 比值 = 面值 ÷ point。按这个口径，当前可兑里最划算的是 6.9 元可乐麦炫酷/香芋派（50 积分，**0.138 元/积分**），而 800 积分的巨无霸组合只有 0.027。

**2. 没过滤有效期和库存状态（第 3 步）**

27 条里 18 条 `downTime` 已经是过去时间（今天 2026-10-20），但 `status` 依然返回 `2`（上架）。所以**只查 status 是筛不掉的**，必须叠加时间窗判断：`upTime ≤ now ≤ downTime && status === 2`。否则会把「罗技键鼠套装」（已于 8-21 结束）、「Nike Book 2」（6-05 结束）这类限时闪兑推给用户，下单必然失败。SKILL.md 里只写「列出可兑换商品」，这个坑一定会踩。

## ⚠️ 字段描述缺失/不准

**账户接口**：漏了 `expiredPoint`（**204.3**，占累计积分的 69%，一个「积分管家」不该不报这个数）、`lastMouthExpirePoint`、`frozenPoint`、`currency`、`accountId`。

**类型陷阱（重要）**：所有积分字段都是**字符串**且带一位小数。字符串比大小会翻车——`"100" <= "84.1"` 在 JS 里为 `true`，但实际 84.1 < 100。当前余额下，正确结论是只有 50 积分的两件可兑，100 积分的**兑不起**。文档应明确要求先转 number/Decimal。示例卡片里的「本月即将过期：12」也和实测的 `0` 不符。

**抽奖接口**：
- `availableTimes` 在纯积分规则下**整个字段不存在**，不是 `0`/`null`。第 43 行的措辞要改成「缺失/0/null」。
- 漏了 `status.code` 枚举（`NOT_LOGIN`/`NO_ACTIVITY`/`ACTIVITY_ERROR`/`ACTIVITY_EXPIRED`）。现在异常处理只靠 `activityStatusText` 判断，登录态失效这类情况抓不到。
- 漏了 `drawDecision.reason`（不满足时的原因）和 `fallbackConsumption`（混合规则兜底消耗）——文档提到了「混合规则」却没写字段名。
- `nextConsumption` 只提了 `.text`，应补 `.type`(NONE/POINTS/CHANCES)/`.points`/`.chances`。
- `prizes` 只有 `name`/`imageUrl`/`typeText`，**没有概率和库存**。用户问「中奖率多少」时 skill 应明确说拿不到，别编。

**其他**：
- `catRuleIds` 只写了 4 个，实际支持 10 个，漏了 `1>6>20` 生日派对、`1>6>21` 主题派对、`1>6>22` 麦麦体验营、`1>6>25` 品鉴会、`1>6>34` 读书会、`1>6>40` 积分兑换活动。
- `query-my-prizes` 支持 `pageNum`/`pageSize`（最大 50）和 `hasMore`/`nextCursor`，文档没提分页。
- **`status` 字段名冲突**：商品接口里 `status` 是 1仓库/2上架/3售罄/4下架/5预热，下单结果里 `status` 是 1成功/2部分/0失败。同一个词两种含义，极易串戏，建议在文档里显式加一句区分。

## ✅ 验证通过的部分

`availablePoint`/`accumulativePoint`/`usedPoint`/`currentMouthExpirePoint`/`nextMouthExpirePoint` 拼写全部正确（含 `Mouth` 这个官方错拼，你标注得很到位）；`drawPoint`、`drawDecision.resourceEligible`、`nextConsumption.text` 均存在且语义符合；`shopId=2` 实测全为 2；`spuId` 确为 integer 类型，`mall-product-detail` 入参要求一致。

## 无法验证

`mall-create-order` 的 `status`（1/2/0）和 `orderItemStatus`、`draw-lottery` 返回结构——这些只有真实下单/抽奖才会出现，按你的要求没有触发。这两段描述目前仍是「未经验证」。

---

要的话我直接把 SKILL.md 改掉：补一张各接口真实字段表（含类型和建议过滤条件）、重写第 3/4 步的面值解析与排序逻辑、把异常处理换成 `status.code` 分派。你确认我就动手 🦞

## 🧑 用户（2026/10/20 19:14:23）

<user_query>确认，请直接修改 skills/mcd-points-manager/SKILL.md：补上各接口真实字段表（含类型和建议过滤条件）、重写面值解析与排序逻辑、异常处理改成按 status.code 分派。改完简要说明改了什么。</user_query>

## 🤖 WorkBuddy（2026/10/20 19:14:51）

确认，开始重写。

> 🔧 调用工具 `Write`：{"content": "---\nname: mcd-points-manager\ndescription: 麦当劳积分管家。当用户查询积分余额、积分快过期、想用积分兑换商品/餐券、查看积分商城、参加积分抽奖、查看抽奖奖品或兑换记录时使用。覆盖积分账户盘点、临期积分兑换推荐、抽奖、订单查询全流程。\n---\n\n# mcd-points-manager 积分管家\n\n## 能力概述\n\n …（截断）
> ✅ `Write` 返回（completed）：Error: File has not been read yet: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-points-manager/SKILL.md. Read it first before writing to it.

> 🔧 调用工具 `Read`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-points-manager/SKILL.md"}
> ✅ `Read` 返回（completed）： 1→--- 2→name: mcd-points-manager 3→description: 麦当劳积分管家。当用户查询积分余额、积分快过期、想用积分兑换商品/餐券、查看积分商城、参加积分抽奖、查看抽奖奖品或兑换记录时使用。覆盖积分账户盘点、临期积分兑换推荐、抽奖、订单查询全流程。 4→---  …（截断）

> 🔧 调用工具 `Write`：{"content": "---\nname: mcd-points-manager\ndescription: 麦当劳积分管家。当用户查询积分余额、积分快过期、想用积分兑换商品/餐券、查看积分商城、参加积分抽奖、查看抽奖奖品或兑换记录时使用。覆盖积分账户盘点、临期积分兑换推荐、抽奖、订单查询全流程。\n---\n\n# mcd-points-manager 积分管家\n\n## 能力概述\n\n …（截断）
> ✅ `Write` 返回（completed）：Successfully overwrote file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-points-manager/SKILL.md

> 🔧 调用工具 `Bash`：{"command": "cd /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-points-manager && wc -l SKILL.md && echo \"--- frontmatter ---\" && head -5 SKILL.md && echo \"--- 章节 ---\" && grep -n \"^#\\{1,4\\} \" …（截断）
> ✅ `Bash` 返回（completed）：Command: cd /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-points-manager && wc -l SKILL.md && echo "--- frontmatter ---" && head -5 SKILL.md && ech …（截断）

> 🔧 调用工具 `Read`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/.workbuddy/memory/2026-10-20.md", "limit": 5}
> ✅ `Read` 返回（completed）： 1→# 2026-10-20 2→ 3→## 验证 mcd-points-manager SKILL.md 工具调用链（只读） 4→ 5→调用 mcd-mcp 的 query-my-account / query-lottery-info / mall-points-products（无写操作）， …（截断）

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/.workbuddy/memory/2026-10-20.md", "old_string": "未验证：mall-create-order / draw-lottery 的写路径字段（按要求未触发）。", "new_string": "未验证：mall-create-order / draw …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/.workbuddy/memory/2026-10-20.md

> 🔧 调用工具 `present_files`：{"cwd": "/Users/jiachen/Projects/kimiPrj/prj24", "explanation": "已按验证结论重写 SKILL.md，展示修改后的文件供查看。", "files": ["/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-points-manager/SKILL.md"]}
> ✅ `present_files` 返回（completed）：

## 🤖 WorkBuddy（2026/10/20 19:15:34）

改完了，`SKILL.md` 从 84 行扩到 273 行，frontmatter 和原有五大块结构都保留，只做内容修正。

## 改了什么

**1. 新增「字段类型通则」章节（放在最前面，先读）**
写明返回信封是 `{success, code, message, datetime, traceId, data}`，必须先判 `success===true && code===200` 才能取 `data`。强调了两个真踩过的坑：积分字段是 string 且带小数，**必须转 number 才能比较**（附了 `"100" <= "84.1"` 的反例）；`status` 在商品接口和下单结果里是两套完全不同的枚举，解析时要按接口区分。

**2. 三个接口的字段表**
- **账户**：补了原来漏掉的 `expiredPoint`（历史已过期）、`lastMouthExpirePoint`、`frozenPoint`、`currency`、`accountId`，并加了自检恒等式 `累计 ≈ 可用 + 已用 + 已过期`。同时把「必须播报 expiredPoint」写成硬要求——这是用户的真实损失，不能只报可用余额。
- **商品列表**：`catRuleIds` 从 4 个补全到 10 个（补上生日派对、主题派对、麦麦体验营、品鉴会、读书会、积分兑换活动）；每条商品补全 `upTime`/`downTime`/`status`/`selling`/`catName`/`shopId` 等字段及用途。
- **抽奖**：补全 `status.code` 五值枚举、`drawDecision` 四个子字段（`resourceEligible`/`reason`/`nextConsumption{type,points,chances,text}`/`fallbackConsumption`）、`drawTypeText` 四值枚举。`query-my-prizes` 补了分页参数和 `hasMore`/`nextCursor`。
- **订单查询**：标注 `mall-order-list` 的 `size` 超过 10 会按 10 查询。

**3. 重写面值解析与排序（核心修复）**
删掉 `price ÷ point` 的错误公式，明确 `price` 是「所需金额」、实测恒为 `"0"`、不可当面值。改成从 `spuName` 用正则 `/(\d+(?:\.\d+)?)\s*元/` 提取面值，解析不到的商品归为「非定值商品」单列、不参与比值排名。排序改为：先按 `Number(point) <= Number(availablePoint)` 分可负担组，组内按 `面值 / point` 降序取 Top 3，不可负担组标注差额。

**4. 新增强制双过滤**
`status === 2` **且** `upTime <= now <= downTime`，并注明「只查 status 不够」、要求过滤后告知用户剔除了多少条。这是防止推荐过期商品的关键。

**5. 异常处理改成按 `status.code` 分派**
做成五值映射表：`SUCCESS` 正常继续、`NOT_LOGIN` 引导重新授权、`NO_ACTIVITY` 如实告知无活动、`ACTIVITY_ERROR` 转述 message + traceId、`ACTIVITY_EXPIRED` 展示起止时间。另加「信封失败」兜底（账户/商城类接口没有 `status` 字段，直接转述 message）。`401/429`、积分不足、商品下架等保留在「其他异常」下。

**6. 抽奖资格的表述收紧**
`availableTimes` 从「0/null」改为「**字段可能整个不存在**」，并强调缺失 / 0 / null 一律不构成「不能抽」的结论，唯一依据是 `resourceEligible` + `nextConsumption`。另加了一条能力边界：`prizes` 不含概率和库存，别编。

**7. 诚实标注未验证部分**
`mall-create-order` 的 `status`(1/2/0) 和 `orderItemStatus` 加了醒目提示「尚未经实测验证，首次真实下单后以实际返回为准」。这部分我没法在不真下单的前提下确认，所以没有假装它是确定的。

输出格式示例里那个和实测对不上的「本月即将过期：12」也顺手改成了 0，卡片补上「历史已过期」一行，推荐表补了「兑后余额」列并区分定值/非定值商品。

要不要我接着用同一套口径把 `mcd-auto-routine` 和 `mcd-saver` 里涉及积分/商品接口的部分也核一遍？那两个大概率是同源写法，可能有一模一样的 `price` 坑 🦞

## 🧑 用户（2026/10/20 19:17:32）

<user_query>好，请用同一套口径把 mcd-auto-routine 和 mcd-saver 里也涉及积分/商品/价格接口的部分核一遍并直接修订对应文件。仍然只做只读调用，不要下单、不要抽奖。全部改完简要汇总。</user_query>

## 🤖 WorkBuddy（2026/10/20 19:17:37）

我先把这两个 skill 的文件都读一遍，找出涉及积分/商品/价格的部分。

> 🔧 调用工具 `Bash`：{"command": "cd /Users/jiachen/Projects/kimiPrj/prj24/skills && find mcd-auto-routine mcd-saver -type f | sort && echo \"=== 行数 ===\" && wc -l $(find mcd-auto-routine mcd-saver -type f -name \"*.md\") …（截断）
> ✅ `Bash` 返回（completed）：Command: cd /Users/jiachen/Projects/kimiPrj/prj24/skills && find mcd-auto-routine mcd-saver -type f | sort && echo "=== 行数 ===" && wc -l $(find mcd-au …（截断）

> 🔧 调用工具 `Read`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/SKILL.md"}

> 🔧 调用工具 `Read`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md"}
> ✅ `Read` 返回（completed）： 1→--- 2→name: mcd-auto-routine 3→description: 麦当劳定时自动化管家。当用户想定时自动领麦当劳优惠券、每天推送活动日历、监控积分临期、定时参加积分抽奖，或想搭建每日麦当劳日报/提醒时使用。内置零依赖 Node.js 脚本，支持企业微信/Bark/Serv …（截断）
> ✅ `Read` 返回（completed）： 1→--- 2→name: mcd-saver 3→description: 麦当劳省钱凑单引擎。当用户想点麦当劳并提到预算、人数、省钱、优惠、凑单、怎么点最划算、用券下单等诉求时使用。覆盖到店自取与麦乐送外送两种场景，自动领券、盘点可用券、多套组合试算比价，用户确认后才下单。 4→--- 5→  …（截断）

## 🤖 WorkBuddy（2026/10/20 19:17:45）

SKILL.md 看完了。关键在 `auto-routine.mjs` 里怎么解析这些字段，得看代码。

> 🔧 调用工具 `Read`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/scripts/auto-routine.mjs"}
> ✅ `Read` 返回（completed）： 1→#!/usr/bin/env node 2→/** 3→ * mcd-auto-routine — 麦当劳中国 MCP 定时自动化脚本 4→ * 5→ * 零依赖（Node.js >= 18，仅使用全局 fetch）。 6→ * 通过 MCP Streamable HTTP 协议顺序调用： 7 …（截断）

## 🤖 WorkBuddy（2026/10/20 19:17:57）

auto-routine 只看积分账户和抽奖，没有商品/价格接口；saver 才是商品和价格的主战场。先核对 saver 涉及的工具定义。

> 🔧 调用工具 `ToolSearch`：{"tool_names": ["mcp__mcd-mcp__calculate-price", "mcp__mcd-mcp__query-meals", "mcp__mcd-mcp__query-store-coupons", "mcp__mcd-mcp__campaign-calendar"]}
> ✅ `ToolSearch` 返回（completed）：Found 4 tool(s). Use DeferExecuteTool to invoke them. ## mcp__mcd-mcp__calculate-price Description: 计算商品的价格（含优惠），支持到店自提(orderType=1)和外送(orderType=2)两种 …（截断）

## 🤖 WorkBuddy（2026/10/20 19:18:07）

`calculate-price` 的单位「分」在工具定义里得到确认 ✅。saver 还断言了 `query-my-coupons` 的 `instructions.availableTime` 字段，这个只能实调验证。

> 🔧 调用工具 `DeferExecuteTool`：{"params": {"page": "1", "pageSize": "5"}, "toolName": "mcp__mcd-mcp__query-my-coupons"}
> ✅ `DeferExecuteTool` 返回（completed）：# 您的优惠券列表 共 3 张可用优惠券 | 第 1/1 页 | 每页 5 条 ## 11.9元麦辣鸡腿堡 - **优惠**: ¥11.9 (用券价格) - **有效期**: 2026-10-19 10:30-2026-10-23 23:59 周一、二、三、四、五 10:30-23:59 - **领 …（截断）

## 🤖 WorkBuddy（2026/10/20 19:18:21）

`query-my-coupons` 的真实返回推翻了 saver 的一个断言——它返回的是 **Markdown 文本**，不是带 `instructions.availableTime` 的 JSON，也没有 `couponId`/`couponCode`。这个要改。先改代码。

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/scripts/auto-routine.mjs", "old_string": "function summarizeAccount(r) {\n  if (!r?.success) return `> 积分账户查询失败：${r?.messag …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/scripts/auto-routine.mjs

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/scripts/auto-routine.mjs", "new_string": "/**\n * 抽奖业务状态码分派（与 mcd-points-manager 同一口径）。\n * 值为 null 表示正常，可继续展示活动详情。\n */\nc …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/scripts/auto-routine.mjs

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/scripts/auto-routine.mjs", "new_string": "  // 2. 活动日历 / 3. 积分账户 / 4. 抽奖信息（只读）\n  const readonlySteps = [\n    ['campaign-c …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/scripts/auto-routine.mjs

## 🤖 WorkBuddy（2026/10/20 19:18:41）

脚本改完了，做个语法检查并验证数值处理逻辑。

> 🔧 调用工具 `Bash`：{"command": "cd /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/scripts && echo \"=== 语法检查 ===\" && /Users/jiachen/.workbuddy/binaries/node/versions/22.22.2-6/bin/node --check auto-routi …（截断）
> ✅ `Bash` 返回（completed）：Command: cd /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/scripts && echo "=== 语法检查 ===" && /Users/jiachen/.workbuddy/binaries/node/ve …（截断）

## 🤖 WorkBuddy（2026/10/20 19:18:48）

语法通过，`296.4` 恒等式也对上了。现在同步 auto-routine 的 SKILL.md。

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/SKILL.md", "new_string": "## 字段口径（与 mcd-points-manager 一致）\n\n脚本解析接口数据时遵循以下约定，改动代码时不要破坏：\n\n- **信封结构**：所有工具返回 `{ success, c …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/SKILL.md

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/SKILL.md", "new_string": "| 顺序 | 工具 | 类型 | 说明 |\n|---|---|---|---|\n| 1 | `auto-bind-coupons` | 写（领券） | `--dry-run` 时跳过 |\n …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/SKILL.md

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/SKILL.md", "new_string": "- **写操作明示**：`auto-bind-coupons`（领券）与 `draw-lottery`（消耗积分）均为写操作。首次部署务必先 `--dry-run` 验证，再上定时；`--dra …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-auto-routine/SKILL.md

## 🤖 WorkBuddy（2026/10/20 19:19:09）

auto-routine 改好了。现在改 saver —— 这里要修的那条字段断言是实测推翻的。

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md", "new_string": "## 价格与字段口径\n\n- **`calculate-price` 返回金额单位是「分」**（工具定义明确要求展示时 ÷100 转元）。对比表里所有价格必须换算成元后再展示，不要混用。\n- **`que …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md", "new_string": "5. `query-store-coupons`（**必传** `storeCode` + `orderType` + `beType`，`beCode` 按 beType 规则传）— 查该门店该订单类型下* …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md", "new_string": "9. `calculate-price` — **对 2~3 套候选组合分别试算**：\n   - **必传**：`storeCode` + `orderType` + `beType`（缺一即报错）；得来速 …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md", "new_string": "- **券限制校验**：优惠券常有适用时段（如仅工作日 10:30 后）、适用渠道（仅到店/仅外送）、门槛金额限制。选券以 `query-store-coupons` 为准；卡包侧的 `query-my-co …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md

## 🤖 WorkBuddy（2026/10/20 19:19:27）

改完了，最后做一次全仓一致性扫描，确认没有残留的旧口径。

> 🔧 调用工具 `Bash`：{"command": "cd /Users/jiachen/Projects/kimiPrj/prj24 && echo \"=== 残留检查 ===\" && for p in \"instructions.availableTime\" \"price ÷ point\" \"price/point\" \"currentMonthExpirePoint=\" \"availableTime …（截断）
> ✅ `Bash` 返回（completed）：Command: cd /Users/jiachen/Projects/kimiPrj/prj24 && echo "=== 残留检查 ===" && for p in "instructions.availableTime" "price ÷ point" "price/point" "curre …（截断）

> 🔧 调用工具 `Bash`：{"command": "cd /Users/jiachen/Projects/kimiPrj/prj24 && echo \"=== instructions.availableTime 命中上下文 ===\" && grep -rn \"instructions.availableTime\" skills/ && echo \"\" && echo \"=== price ÷ point 命 …（截断）
> ✅ `Bash` 返回（completed）：Command: cd /Users/jiachen/Projects/kimiPrj/prj24 && echo "=== instructions.availableTime 命中上下文 ===" && grep -rn "instructions.availableTime" skills/  …（截断）

## 🤖 WorkBuddy（2026/10/20 19:19:40）

三处命中都是有意的否定警示，不是残留。更新工作日志。

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/.workbuddy/memory/2026-10-20.md", "new_string": "- 对未实测的写路径（mall-create-order 的 status 1/2/0、orderItemStatus）显式标注「尚未经实测验证」。\n\n## 同口径核查并修订 mcd-auto …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/.workbuddy/memory/2026-10-20.md

> 🔧 调用工具 `present_files`：{"cwd": "/Users/jiachen/Projects/kimiPrj/prj24", "explanation": "两个 skill 的修订版：auto-routine 的 SKILL.md 与脚本、saver 的 SKILL.md。", "files": ["/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.m …（截断）
> ✅ `present_files` 返回（completed）：

## 🤖 WorkBuddy（2026/10/20 19:19:53）

核完改完了。这两个 skill 的问题性质完全不同：auto-routine 是**代码里的判断逻辑漏了 `status.code`**，saver 是**凭想象写了一个不存在的字段**。

## mcd-auto-routine

先说范围：它只调 `query-my-account` 和 `query-lottery-info`，**完全没碰商品/价格接口**，所以 `price` 那个坑不存在。问题集中在两处。

**代码（`auto-routine.mjs`，407 → 491 行）**

- 加 `num()`/`fmt()` 处理 string 转数值和浮点尾巴，`summarizeAccount` 全部改用它
- 补 `expiredPoint`（真实值 **204.3**）和 `usedPoint` 播报——原脚本只报「可用 + 累计」，把用户历史流失的 204 积分藏掉了，这对一个主打「监控积分临期」的工具是明显缺失
- `summarizeLottery` 新增 `status.code` 五值分派，补了 `drawDecision.reason`（不满足时的原因）和 `fallbackConsumption`（兜底消耗），奖池明确标注「接口不含中奖概率与库存」
- **最要紧的一处**：新增 `drawBlockReason()`。原来只要带了 `--draw` 就无条件调 `draw-lottery`，完全不看状态。定时任务无人值守，活动异常或积分不够时照样硬抽，白失败还可能吃风控。现在必须同时满足 `status.code === "SUCCESS"`、`activityStatusText === "进行中"`、`resourceEligible === true` 才放行，否则跳过并在日报里写明原因、明确「本次未消耗任何积分」

验证：`node --check` 通过；数值逻辑实测 `fmt(84.1)→84.1`、恒等式 `84.1+8+204.3=296.4` 与累计完全对上、`"100" <= "84.1"` 字符串为 `true` 而数值为 `false`（陷阱复现）。

**SKILL.md（151 → 185 行）**：新增「字段口径」节，把抽奖护栏的三条门槛写成显式规则，异常处理补 `status.code` 分派表。

## mcd-saver

这里逮到一个硬错。SKILL.md 原本写「`query-my-coupons` 里 `instructions.availableTime` 字段可用于核对时段」——我实调了一次（只读），这个字段**不存在**，而且更严重：

**该接口返回的是渲染好的 Markdown 文本，不是 JSON**。输出是「## 券名 / 优惠 / 有效期 / 领取时间 / 标签 / `<img>`」这样的排版文案，**根本没有 `couponId` 和 `couponCode`**。而 step 9 又写着「可选 `couponId`/`couponCode`（从第三步的可用券中取）」——如果模型照着做，从卡包文案里根本取不到券 id，试算必然失败或者干脆编一个。

改动：
- 新增「价格与字段口径」节，明确 `query-my-coupons` 是 Markdown、**不能作用券入参来源**、`couponId`/`couponCode` 只能从 `query-store-coupons` 取；时段看「有效期」行、渠道看「标签」行（实测确实有「到店专用、外送专用」这类标签）
- step 5 补 `query-store-coupons` 的必传参数（`orderType`/`beType`/`storeCode`）和「`storeCode` 必须纯数字」的校验
- step 9 补 `calculate-price` 必传 `storeCode`+`orderType`+`beType`（原文只列了 `items[]`，漏了顶层必传参数）、`reservationDate` 用法、`modification` 的 `selectedKey`/`unselectedKey` 规则
- `calculate-price` 单位「分」**经工具定义确认，原文档是对的** ✅，保留

全仓扫了一遍旧口径残留（`price ÷ point`、`instructions.availableTime`、`availableTimes=0`），剩 3 处命中全是我写的否定警示，没有漏网的。

## 还有三个没验证的

1. `query-meals` 的菜单价单位——工具定义只写「可查看价格」，没说分还是元。我在 saver 里加了「先抽一条核对量级再换算」的提示，没敢替它下结论。
2. `calculate-price` 的 `data.takeWayList[].code` 结构——要真实试算才能确认，已标注未验证。
3. `query-store-coupons` 返回是否真的含 `couponId`——需要门店才能调，逻辑上它是唯一可能的结构化来源，但也标了。

要补这三项的话，需要你给一个门店（城市+地标），我用只读链 `query-nearby-stores → query-meals → calculate-price` 跑一遍就能全部确认 🦞

## 🧑 用户（2026/10/20 19:21:45）

<user_query>门店给你：城市上海，地标人民广场。请用只读链 query-nearby-stores → query-meals → query-store-coupons → calculate-price 跑一遍确认这三项（菜单价格单位、takeWayList 结构、couponId），并据实更新 mcd-saver 的 SKILL.md。仍然不要真实下单。</user_query>

## 🤖 WorkBuddy（2026/10/20 19:21:49）

收到，上海人民广场。先加载门店查询工具定义。

> 🔧 调用工具 `ToolSearch`：{"tool_names": ["mcp__mcd-mcp__query-nearby-stores"]}
> ✅ `ToolSearch` 返回（completed）：Found 1 tool(s). Use DeferExecuteTool to invoke them. ## mcp__mcd-mcp__query-nearby-stores Description: 到店场景下，查询用户可点餐门店，需要用户明确是到店自取还是车道取餐 - beType=1(到 …（截断）

> 🔧 调用工具 `DeferExecuteTool`：{"params": {"beType": 1, "searchType": 2, "city": "上海市", "keyword": "人民广场"}, "toolName": "mcp__mcd-mcp__query-nearby-stores"}
> ✅ `DeferExecuteTool` 返回（completed）：每个门店的基本信息按单行展示： - **门店名称**: data[].storeName - **门店地址**: data[].address - **到店距离**: data[].distance - **门店编号**: data[].storeCode, 唯一编号，工具入参 - **业务编码** …（截断）

## 🤖 WorkBuddy（2026/10/20 19:21:57）

最近的是「华旭国际大厦餐厅」（1450713，144m）。查菜单。

> 🔧 调用工具 `DeferExecuteTool`：{"params": {"storeCode": "1450713", "orderType": 1, "beType": 1}, "toolName": "mcp__mcd-mcp__query-meals"}
> ✅ `DeferExecuteTool` 返回（completed）：# API Response Information Below is the response from an API call. To help you understand the data, I've provided: 1. A detailed description of all fi …（截断）

## 🤖 WorkBuddy（2026/10/20 19:22:03）

`query-meals` 的价格是**元**（`"currentPrice":"33.5"`、圆筒 `"5"`），不是分 —— 这是要点。继续查券。

> 🔧 调用工具 `DeferExecuteTool`：{"params": {"beType": 1, "orderType": 1, "storeCode": "1450713"}, "toolName": "mcp__mcd-mcp__query-store-coupons"}
> ✅ `DeferExecuteTool` 返回（completed）：## Response Structure - **重要**: 同一券ID可对应多个券码，展示时按券ID分组 ## 字段说明 | 字段 | 数据源 | 展示规则 | 是否展示 |-----|--------|----------|--| | 券名 | `data[].title` | 完整显示 |  …（截断）

## 🤖 WorkBuddy（2026/10/20 19:22:08）

券是结构化 JSON，`couponId`/`couponCode` 确认在此 ✅。最后一步：用「11.9元麦辣鸡腿堡」券试算一套组合。

> 🔧 调用工具 `DeferExecuteTool`：{"params": {"storeCode": "1450713", "orderType": 1, "beType": 1, "items": [{"productCode": "1440", "quantity": 1, "couponId": "A255280326E3328D179C362B7B8DDA65", "couponCode": "MCD696A1QU01000CM2611"} …（截断）
> ✅ `DeferExecuteTool` 返回（completed）：# API Response Information Below is the response from an API call. To help you understand the data, I've provided: 1. A detailed description of all fi …（截断）

## 🤖 WorkBuddy（2026/10/20 19:22:19）

三项全部确认，且挖出两个新问题。先看当前文件再改。

> 🔧 调用工具 `Read`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md"}
> ✅ `Read` 返回（completed）： 1→--- 2→name: mcd-saver 3→description: 麦当劳省钱凑单引擎。当用户想点麦当劳并提到预算、人数、省钱、优惠、凑单、怎么点最划算、用券下单等诉求时使用。覆盖到店自取与麦乐送外送两种场景，自动领券、盘点可用券、多套组合试算比价，用户确认后才下单。 4→--- 5→  …（截断）

## 🤖 WorkBuddy（2026/10/20 19:22:30）

三项已确认。现在把这些实测事实写进 saver。

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md", "new_string": "## 价格与单位口径（均为实测确认）\n\n**两个接口的金额单位不同，差 100 倍，混用必出事故：**\n\n| 接口 | 相关字段 | 单位 | 实测样例 |\n|---|---|---|---|\n| …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md", "new_string": "5. `query-store-coupons`（**必传** `storeCode` + `orderType` + `beType`，`beCode` 按 beType 规则传）— 查该门店该订单类型下* …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md", "new_string": "7. `query-meals`（**必传** `storeCode` + `orderType` + `beType`；预约传 `reservationDate`）— 获取该门店在售餐品及价格，结合用户偏好 …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md", "new_string": "   - 返回金额单位为**分**，展示时 ÷100 转元\n   - 返回结构（已实测）：\n\n     | 字段 | 类型 | 单位 | 说明 |\n     |---|---|---|---|\n   …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md", "new_string": "- **券限制校验**：券常有适用时段、适用渠道（仅到店/仅外送）、门槛金额限制。**两个券接口要互补使用**：\n  - `query-store-coupons` 的 `tradeDateTime` 只给 …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md

> 🔧 调用工具 `Read`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md", "offset": 118}
> ✅ `Read` 返回（completed）： 118→- **下单确认红线**：`create-order` 前必须把方案（商品明细、数量、用券、券后价、门店、取餐方式）完整展示给用户，得到"就这套/下单"等明确确认后才可调用。未确认绝不下单。 119→- **券限制校验**：券常有适用时段、适用渠道（仅到店/仅外送）、门槛金额限制。**两个 …（截断）

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md", "new_string": "| 方案 | 组成 | 原价 | 用券 | 券后价 | 节省 |\n|---|---|---|---|---|---|\n| A | 麦辣鸡腿汉堡+中薯+可乐 | ¥45.5 | 11.9元麦辣鸡腿堡券 |  …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md

> 🔧 调用工具 `Bash`：{"command": "cd /Users/jiachen/Projects/kimiPrj/prj24 && echo \"=== 残留旧表述 ===\" && for p in \"未经实测确认\" \"另行核对\" \"未经实测验证\" \"takeWayList\\[\\].code.*未\"; do printf \"%-24s \" \"$p\"; grep -rn \"$p\" s …（截断）
> ✅ `Bash` 返回（completed）：Command: cd /Users/jiachen/Projects/kimiPrj/prj24 && echo "=== 残留旧表述 ===" && for p in "未经实测确认" "另行核对" "未经实测验证" "takeWayList\[\].code.*未"; do printf "% …（截断）

> 🔧 调用工具 `Bash`：{"command": "cd /Users/jiachen/Projects/kimiPrj/prj24 && grep -rn \"未经实测验证\" skills/ && echo \"---\" && grep -n \"单位\\|÷100\" skills/mcd-saver/SKILL.md", "description": "定位残留并确认单位表述"}
> ✅ `Bash` 返回（completed）：Command: cd /Users/jiachen/Projects/kimiPrj/prj24 && grep -rn "未经实测验证" skills/ && echo "---" && grep -n "单位\|÷100" skills/mcd-saver/SKILL.md Stdout: s …（截断）

> 🔧 调用工具 `Grep`：{"pattern": "单位|÷100|100 倍", "path": "/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md", "output_mode": "content", "-n": true}
> ✅ `Grep` 返回（completed）：["/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md:19:## 价格与单位口径（均为实测确认）","/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL …（截断）

## 🤖 WorkBuddy（2026/10/20 19:23:22）

改好了。更新工作日志。

> 🔧 调用工具 `Edit`：{"file_path": "/Users/jiachen/Projects/kimiPrj/prj24/.workbuddy/memory/2026-10-20.md", "new_string": "遗留待验证：`query-meals` 价格单位、`calculate-price` 的 `takeWayList` 结构、`query-store-coupons` 返回是否含 couponId …（截断）
> ✅ `Edit` 返回（completed）：Successfully edited file: /Users/jiachen/Projects/kimiPrj/prj24/.workbuddy/memory/2026-10-20.md

> 🔧 调用工具 `present_files`：{"cwd": "/Users/jiachen/Projects/kimiPrj/prj24", "explanation": "据实测结果更新后的 mcd-saver SKILL.md。", "files": ["/Users/jiachen/Projects/kimiPrj/prj24/skills/mcd-saver/SKILL.md"]}
> ✅ `present_files` 返回（completed）：

## 🤖 WorkBuddy（2026/10/20 19:23:33）

三个只读调用已经跑通。门店选的是最近的「华旭国际大厦餐厅」（`storeCode=1450713`，144 米），全程没有下单。

## 三项确认结果

**1. 菜单价格单位 = 元** ✅ 但这是个 100 倍的坑。
`query-meals` 返回 `currentPrice: "22.5"`、圆筒冰淇淋 `"5"`、可乐 `"9.5"` —— **元**。而 `calculate-price` 返回 `price: 3490` —— **分**。
交叉校验做了：1440 麦辣鸡腿汉堡在菜单里 `22.5`，在试算里 `productOriginalPrice: 2250`，正好 100 倍关系，完全吻合。
**所以原文档那句「`query-meals` 单位另行核对」是个定时炸弹**：如果模型把菜单价再除一次 100，单人餐会显示 ¥0.225；反过来把试算结果当元，就是 ¥3490。现在文档里明确写成「`query-meals` 禁止再 ÷100」，并加了交叉校验公式。

**2. `takeWayList` 结构** ✅ 原文档路径正确。
实测返回 `{code, title, subtitle}`，到店场景有两项：`eat-in`（堂食/店内用餐）、`locker-out`（外带/店外取餐柜）。原文档说 `data.takeWayList[].code` 是对的。
但补了一条：**有两个选项，必须让用户选**，不能默认取第一个——`takeWayCode` 是下单必传，选错就得退单。

**3. `couponId`** ✅ 确实来自 `query-store-coupons`。
返回结构化 JSON：`title`/`couponId`/`couponCode`/`tradeDateTime`/`products[].productCode`/`promotionId`。我用「11.9元麦辣鸡腿堡」券试算，1440 小计从 2250 分降到 1190 分，**券真实生效**，链路闭合。

## 顺手挖到的 6 个新问题（都已写进文档）

这几个比原定三项更值钱：

- **`query-meals` 是两段式结构**，不是扁平数组。`data.categories[]` 只给 code，真正的名称价格在 `data.meals` 这个**以 productCode 为 key 的映射表**里。原文档完全没提，模型很可能对着 categories 找不到价格。
- **`discountType` 陷阱**：当它是「随单购麦金卡优惠」时，`currentPrice` **必须同时买随单购才成立**。实测「全明星双人分享餐八件套」`currentPrice` 49.9 vs `originalPrice` 114.5 —— 不买卡就多花 64.6 元。一个「省钱引擎」不算这个，等于把人往坑里带。
- **`productList` 顺序不保证**：我传 1440 → 4810 → 可乐，返回 4810 → 可乐 → 1440。必须按 `productCode` 匹配，按下标取会张冠李戴。
- **`enjoyed`/`enjoyable` 内部混合单位**：`realDiscount` 是**元**，同级的 `balance` 是**分**。同一个对象里两种单位。
- **券绑定商品可能不在菜单里**：19.9 元王牌炸鸡券绑的 `9900016534` 在该门店 `query-meals` 里查不到。已加护栏：查不到就提示该券可能不适用，别硬拼 productCode。
- **时段信息要两个接口互补**：`query-store-coupons.tradeDateTime` 只有绝对区间、**没有星期规则**；「周一至周五 10:30-23:59」这种细则只在 `query-my-coupons` 的 Markdown 文案里。我上一轮写的「时段以 store-coupons 为准」说得太满，这轮修正了。

另外 `withOrder.specId` 要映射成 `calculate-price` 入参的 `membershipSpecId`，而 `cardId`/`cardType` 菜单里根本不提供——这个也标注了。

## 文件变化

`skills/mcd-saver/SKILL.md`：107 → 150 行。新增「价格与单位口径」节（带对照表和交叉校验公式）、step 5/7/9 的实测细节与返回结构表、护栏 3 条（单位/`discountType`/券来源）、异常处理 2 条（券商品不在菜单、价格量级异常）。输出示例也换成了这次的真实数据：¥45.5 原价、券后 ¥34.9、省 ¥10.6。

全仓扫过，旧的「未经实测确认」「另行核对」表述已清零；唯一保留的「尚未经实测验证」是 points-manager 里 `mall-create-order` 的写操作字段——那个确实还没验证过，不打算替它编 🦞

---

会话 ID：b782ef6d-efad-45ec-9834-f81f18179da2；模型：Deepseek-V4.1-Flash；工作空间：/Users/jiachen/Projects/kimiPrj/prj24；导出时间：2026/10/20 19:28:25