---
name: mcd-points-manager
description: 麦当劳积分管家。当用户查询积分余额、积分快过期、想用积分兑换商品/餐券、查看积分商城、参加积分抽奖、查看抽奖奖品或兑换记录时使用。覆盖积分账户盘点、临期积分兑换推荐、抽奖、订单查询全流程。
---

# mcd-points-manager 积分管家

## 能力概述

盘点用户麦享会积分账户（可用/本月过期/下月过期/历史已过期），有临期积分时主动推荐积分商城中最划算的兑换；支持积分抽奖（消耗前必须确认）与奖品、兑换记录查询。让每一分积分都花在刀刃上。

## 触发场景

- "我还有多少积分？会不会过期？"
- "积分能换什么？帮我挑个最值的"
- "帮我抽一次奖"
- "我之前兑换的券到哪了？"
- "我抽中过什么奖品？"

## 字段类型通则（先读这一节）

所有接口的返回都是一个信封结构：

```
{ success, code, message, datetime, traceId, data }
```

- **先判信封**：`success === true && code === 200` 才从 `data` 取值；否则按「异常处理」分派。报错时把 `traceId` 一并转述，便于排查。
- **积分与金额一律是 `string`，且可能带一位小数**（如 `"84.1"`、`"296.4"`）。**禁止直接用字符串比较大小或做算术**，必须先 `Number()` / `Decimal` 转换。
  - 反例：`"100" <= "84.1"` 在 JS 中为 `true`，但数值上 84.1 < 100。曾因此把买不起的商品判定为买得起。
- **时间字段是 `"YYYY-MM-DD HH:mm:ss"` 字符串**，格式定长可直接字典序比较，但建议统一 `new Date()` 后比较，避免时区歧义。
- **`status` 是重名陷阱**：商品接口里 `status` 表示库存状态（1仓库/2上架/3售罄/4下架/5预热），下单结果里 `status` 表示成功状态（1全部成功/2部分成功/0失败）。两者语义完全不同，解析时务必按所处接口区分。

## 工具调用链

### 场景一：积分盘点 + 临期兑换推荐

#### 1. `query-my-account`（无参数）— 积分账户

| 字段 | 类型 | 含义 | 备注 |
|---|---|---|---|
| `availablePoint` | string | 可用积分 | 兑换/抽奖的唯一可用余额 |
| `accumulativePoint` | string | 累计获得积分 | 历史总流入 |
| `usedPoint` | string | 已使用积分 | |
| `expiredPoint` | string | **已过期积分** | 历史累计流失，**必须播报** |
| `currentMouthExpirePoint` | string | 本月将过期 | 拼写是 `Mouth` |
| `nextMouthExpirePoint` | string | 下月将过期 | 拼写是 `Mouth` |
| `lastMouthExpirePoint` | string | 上月已过期 | 拼写是 `Mouth` |
| `frozenPoint` | string | 冻结积分 | 不可用，需单独说明 |
| `currency` | string | 积分币种 | 实测为 `"麦享会积分"` |
| `accountId` | string | 账户 ID | UUID，一般不展示 |

**自检恒等式**：`accumulativePoint ≈ availablePoint + usedPoint + expiredPoint`。
对不上时不要硬凑，如实展示各字段即可（可能存在冻结或活动补贴积分）。

**播报要求**：`expiredPoint > 0` 时必须在账户卡片里单独一行提示历史已过期数量——这是用户的真实损失，属于积分管家的核心信息，不能只报可用余额。

#### 2. 临期判断与提醒

- `currentMouthExpirePoint > 0` → 高优先级提醒（本月就没了）
- `nextMouthExpirePoint > 0` → 中优先级提醒
- 两者皆 0 → 正常展示，不制造焦虑，可顺带说明「近期无积分过期风险」

#### 3. `mall-points-products`（可选 `catRuleIds`）— 商品列表

`catRuleIds` 支持多选（逗号分隔），**不传则返回全部类型**：

| 值 | 类目 |
|---|---|
| `1>4` | 商品券（非预付优惠券） |
| `2` | 实物商品 |
| `2>8` | 周边产品 |
| `2>9` | 实物礼品卡 |
| `1>6>20` | 生日类派对 |
| `1>6>21` | 主题类派对 |
| `1>6>22` | 麦麦体验营 |
| `1>6>25` | 品鉴会 |
| `1>6>34` | 读书会 |
| `1>6>40` | 积分兑换活动 |

示例：`1>4,2`

返回 `data` 为数组，每条字段：

| 字段 | 类型 | 含义 | 用途 |
|---|---|---|---|
| `spuName` | string | 商品名称 | **面值只能从这里解析** |
| `spuId` | integer | 商品 ID | 传给 `mall-product-detail` |
| `point` | string | 所需积分 | 排序与可负担性判断 |
| `price` | string | **所需金额（非面值！）** | 实测恒为 `"0"`，**不可用作面值** |
| `selling` | string | 商品卖点 | 含限购/限量/开抢时间等关键约束 |
| `upTime` | string | 可兑换起始时间 | 时效过滤 |
| `downTime` | string | 可兑换截止时间 | 时效过滤 |
| `status` | integer | 库存状态 | 1仓库/2上架/3售罄/4下架/5预热 |
| `catName` | string | 类目名称 | |
| `spuImage` | string | 商品图 | |
| `shopId` | integer | 门店 ID | 兑换需 `shopId=2` |

**必须先做两道过滤（缺一不可）：**

1. **库存过滤**：仅保留 `status === 2`。`3`（售罄）、`4`（下架）、`1`（仓库）、`5`（预热）一律排除。
2. **时效过滤**：仅保留 `upTime <= now <= downTime`。

> ⚠️ **只查 `status` 是不够的**。实测列表中大量商品 `status === 2` 但 `downTime` 早已过去（限时闪兑、每日限量活动尤其多）。若不过滤 `downTime`，会把已结束的活动推给用户，下单必然失败。过滤后应向用户说明「已剔除 N 个已过期/已售罄商品」，保持透明。

另外，`selling` 里常含「每日限量 5 份，先到先得」「每人限购一双」等约束，推荐时必须一并告知。

#### 4. 面值解析与「积分价值比」排序（核心逻辑）

**`price` 字段不是面值**，它是「所需额外支付金额」，积分纯兑商品恒为 `"0"`。用 `price ÷ point` 计算价值比会全部得 0、排序完全失效。

**正确做法：从商品名解析面值。**

```
面值 = 从 spuName 匹配 /(\d+(?:\.\d+)?)\s*元/ 捕获的数字
例："18.8元2份麦辣鸡翅" → 18.8
    "21.9元巨无霸可乐组合" → 21.9
    "3.9元圆筒冰淇淋" → 3.9
```

解析失败的商品（实物、周边、联名款、积分兑换活动等无「N元」表述）→ **归为「非定值商品」**，不参与价值比排序，只在用户明确想兑实物时单独展示，并说明「无法计算每积分价值」。

**排序公式：**

```
每积分价值 = 面值 / Number(point)   // 单位：元/积分
```

排序规则：

1. 先按可负担性分组：`Number(point) <= Number(availablePoint)` 为可负担组
2. 可负担组内按「每积分价值」**降序**，取 Top 3 推荐
3. 不可负担组单独列出，标注差额（`Number(point) - Number(availablePoint)`），不参与 Top 3

**排序必须展示计算依据**（面值、所需积分、每积分价值），让用户能自己复核，不能只丢一个排名。

#### 5. `mall-product-detail`（`spuId`: integer，必传）— 查 SKU

返回该 SPU 的全部 SKU 规格，让用户选定具体规格。记下 `skuId` 和 `spuCategory`（`"1"` 虚拟券 / `"2"` 实物），并确认 `shopId === 2`。

#### 6. 实物商品补地址

`spuCategory === "2"` 时：`delivery-query-addresses` 让用户选地址；无地址则 `delivery-create-address` 创建。虚拟券（`"1"`）跳过本步。

#### 7. `mall-create-order`（写操作，必须二次确认）

展示兑换确认单：商品名、规格、消耗积分、兑后余额（`Number(availablePoint) - Number(point)`）、实物商品附收货地址 → **用户明确确认后**才调用。

- 入参：`skuId` + `spuCategory`，实物必传 `addressId`
- 多个商品**必须分别下单且串行排队**，等前一单返回后再发下一单，禁止并发
- 结果解析：`status` 为 **1 全部成功 / 2 部分成功 / 0 失败**（与商品的库存 `status` 枚举完全不同，注意区分），并逐个检查 `orderItem.orderItemStatus`

> ⚠️ 本节 `status`(1/2/0) 与 `orderItemStatus` 的取值含义**尚未经实测验证**（验证过程只做了只读调用）。首次真实下单后请以实际返回为准；若与本文不符，原样转述接口 `message` 并回报差异。

#### 8. `query-my-coupons`（可选 `page`/`pageSize`）— 确认券入卡包

虚拟券兑换成功后用它确认到账。支持分页：`page` 默认 1、最多 5 页；`pageSize` 默认 200、最大 200。

注意：此接口返回「用户拥有的券」，**不做门店/渠道/配送方式校验**，不代表当前订单可用。要判断当前门店可用券请用 `query-store-coupons`。

### 场景二：积分抽奖

#### 1. `query-lottery-info`（无参数）— 活动与资格

| 字段 | 类型 | 含义 |
|---|---|---|
| `status.code` | string | 业务状态码：`SUCCESS`/`NOT_LOGIN`/`NO_ACTIVITY`/`ACTIVITY_ERROR`/`ACTIVITY_EXPIRED` |
| `status.message` | string | 状态文案 |
| `activityCode` | string | 活动号 |
| `activityName` | string | 活动名称 |
| `activityStatusText` | string | 未开始 / 进行中 / 已结束 / 活动不存在 |
| `beginTime` / `endTime` | string | 活动起止时间 |
| `drawPoint` | string | 单次所需积分 |
| `drawTypeText` | string | 无 / 消耗积分抽奖 / 消耗任务完成次数 / 先消耗次数再消耗积分抽奖 |
| `availableTimes` | integer | 剩余可抽次数，**纯积分规则下该字段可能整个不存在** |
| `availablePoint` | string | 当前可用积分，任务次数规则下可能不存在 |
| `drawDecision` | object | 服务端资源决策，见下 |
| `prizes` | array | 奖池：`{name, imageUrl, typeText}` |

`drawDecision` 子字段：

| 字段 | 类型 | 含义 |
|---|---|---|
| `resourceEligible` | boolean | 积分/次数资源是否满足本次抽奖 |
| `reason` | string \| null | 不满足时的原因；满足时为 `null` |
| `nextConsumption` | object | 本次实际消耗：`{type: NONE\|POINTS\|CHANCES, points, chances, text}` |
| `fallbackConsumption` | object \| null | 混合规则下先消耗次数后的兜底积分消耗；其他情况为 `null` |

**资格判断唯一依据**：`drawDecision.resourceEligible` + `drawDecision.nextConsumption`。

> ⚠️ **严禁用 `availableTimes` 推断能否抽奖**。纯积分规则（`drawTypeText === "消耗积分抽奖"`）下该字段**根本不返回**（不是 `0`、不是 `null`，是字段缺失）。混合规则下即使 `availableTimes === 0`，只要 `nextConsumption.type === "POINTS"` 仍可用积分抽。缺失 / 0 / null 一律不构成"不能抽"的结论。

**奖池能力边界**：`prizes` 只有名称、图片、类型三项，**不含中奖概率、也不含剩余库存**。用户问「中奖率多少」「还有几个」时，如实说明接口未提供，不要估算或编造。

#### 2. 展示 + 明确确认

展示奖池 + **`drawDecision.nextConsumption.text` 原文**（如"本次将消耗 24 积分"）+ 当前可用积分 + 抽后余额，得到用户**明确确认**后才可继续。

#### 3. `draw-lottery`（无参数）— 执行抽奖

一次调用抽一次。失败时原样转述 `message`，**不自动重试**。

#### 4. 结果展示与历史

展示中奖结果。历史奖品用 `query-my-prizes`（可选 `pageNum`/`pageSize`，默认第 1 页 / 10 条，**最大 50 条**）。

返回：`prizes`（含 `id`/`name`/`imageUrl`/`prizeType`/`recordTime`/`status`/`statusText`/`timeRemindText`，按中奖时间倒序）、`pageNum`、`pageSize`、`hasMore`、`nextCursor`；返回被截断时附 `truncated: true`。

奖品状态：可用 / 已使用 / 已过期 / 已领取 / 已失效。`hasMore` 为 true 时提示用户可翻页，不要只报第一页就当全部。

### 场景三：兑换记录查询

1. `mall-order-list`（可选 `lastId` 游标 + `size`，`size` 默认 10、**超过 10 按 10 查询**）— 商城订单列表
2. `mall-order-detail`（`orderId`）— 单笔详情；查完引导"您可以打开麦当劳 App 查看凭证等其他信息"
3. **订单体系区分**：商城兑换订单走 `mall-order-list`/`mall-order-detail`；点餐订单走 `order-list`/`query-order`，两套互不相通，别混用

## 关键约束与护栏

- **消耗积分必确认**：`mall-create-order`、`draw-lottery` 都会真实扣减积分，调用前必须展示消耗明细并获得用户明确确认，无一例外。
- **抽奖确认内容**：确认文案必须包含 `drawDecision.nextConsumption.text` 原文（本次实际消耗什么、多少），不能只说"要抽奖吗"。
- **串行下单**：多件商品逐单创建、逐单等待，禁止并发。
- **先转数字再比较**：所有积分/金额字段是 string 且带小数，比较与算术前必须转 number。
- **面值不从 `price` 取**：`price` 是所需金额（恒为 0），面值只能从 `spuName` 解析。
- **列表必过滤**：`status === 2` 且 `upTime <= now <= downTime`，两条都要。
- **数据真实**：积分余额、商品价格、所需积分一律以接口返回为准；推荐排序的"每积分价值"要展示计算依据。
- **过期字段名**：账户返回里是 `currentMouthExpirePoint`/`nextMouthExpirePoint`（Mouth），解析时不要写成 Month。
- **必须播报历史过期积分**：`expiredPoint` 是用户的真实损失，不能只报可用余额。

## 输出格式建议

积分账户卡片（数值为占位示例，实际以接口返回为准）：

```
💰 积分账户
- 可用积分：84.1
- 本月即将过期：0
- 下月即将过期：0
- 历史已过期：204.3（已流失）
- 累计获得：296.4 ｜ 已使用：8
```

兑换推荐表（按每积分价值降序，须展示计算依据）：

| 推荐 | 商品 | 所需积分 | 面值 | 每积分价值 | 兑后余额 |
|---|---|---|---|---|---|
| ⭐ | xx 券 | 50 | ¥6.9 | 0.138 元 | 34.1 |
| | xx 周边 | 800 | — | 非定值 | 不够（差 715.9） |

非定值商品（实物/联名/活动）单列，不参与比值排名。

## 异常处理

### 按 `status.code` 分派（抽奖类接口）

| `status.code` | 含义 | 处置 |
|---|---|---|
| `SUCCESS` | 正常 | 继续业务流程 |
| `NOT_LOGIN` | 登录态失效 | 提示到 https://open.mcd.cn/mcp 重新授权，并转述 `status.message` |
| `NO_ACTIVITY` | 无进行中的活动 | 如实告知「当前没有可参与的积分抽奖活动」，不虚构奖池 |
| `ACTIVITY_ERROR` | 活动异常 | 原样转述 `status.message` + `traceId`，建议稍后重试 |
| `ACTIVITY_EXPIRED` | 活动已结束 | 展示 `beginTime`/`endTime`，说明已结束 |

其他状态码：原样转述 `status.message`，不自行归类。

### 其他异常

- **信封失败**：`success !== true` 或 `code !== 200` 时，先看 `message`；有 `status` 字段按上表映射，无 `status` 字段的接口（账户/商城类）直接转述 `message` + `traceId`。
- **HTTP 401 / 429**：401 为 Token 失效，提示到 https://open.mcd.cn/mcp 重新申请；429 为限流，稍后重试一次，仍失败则告知用户。
- **积分不足**：用 `query-my-account` 的 `availablePoint` 校验（转 number 后比较），不足时直接告知差额，不发起下单。
- **活动状态非"进行中"**：以 `activityStatusText` 与 `status.code` 双重确认，避免只看文案漏判登录态问题。
- **抽奖/兑换失败**：原样转述返回的 `message`；**不要重试写操作**，先与用户确认。
- **商品已下架/售罄**：列表可能变化，以下单时接口返回为准；失败则重新拉列表（含时效过滤）让用户改选。
- **面值解析失败**：不要猜测面值，标注「非定值商品」并说明无法计算每积分价值。
