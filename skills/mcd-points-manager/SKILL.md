---
name: mcd-points-manager
description: 麦当劳积分管家。当用户查询积分余额、积分快过期、想用积分兑换商品/餐券、查看积分商城、参加积分抽奖、查看抽奖奖品或兑换记录时使用。覆盖积分账户盘点、临期积分兑换推荐、抽奖、订单查询全流程。
---

# mcd-points-manager 积分管家

## 能力概述

盘点用户麦享会积分账户（可用/本月过期/下月过期），有临期积分时主动推荐积分商城中最划算的兑换；支持积分抽奖（消耗前必须确认）与奖品、兑换记录查询。让每一分积分都花在刀刃上。

## 触发场景

- "我还有多少积分？会不会过期？"
- "积分能换什么？帮我挑个最值的"
- "帮我抽一次奖"
- "我之前兑换的券到哪了？"
- "我抽中过什么奖品？"

## 工具调用链

### 场景一：积分盘点 + 临期兑换推荐

1. `query-my-account`（无参数）— 返回：
   - `availablePoint` 可用积分、`accumulativePoint` 累计、`usedPoint` 已用
   - `currentMouthExpirePoint` 本月将过期、`nextMouthExpirePoint` 下月将过期（注意字段名里是 Mouth 拼写）
2. 若本月/下月有临期积分 → 主动提醒，并进入兑换推荐：
3. `mall-points-products`（可选 `catRuleIds` 筛选：`1>4` 商品券、`2` 实物、`2>8` 周边、`2>9` 礼品卡）— 列出可兑换商品及所需积分（`point` 字段）和面值/价格（`price` 字段）
4. 计算每个商品的"积分价值比"（price ÷ point，即每积分抵多少元），**按比值从高到低排序**，筛出用户积分负担得起的 Top 3 推荐
5. 用户选定后 `mall-product-detail`（spuId）— 查 SKU 列表，让用户选规格 → 记下 `skuId`、`spuCategory`（"1"虚拟券 / "2"实物），确认 `shopId=2`
6. 实物商品（spuCategory="2"）还需收货地址：`delivery-query-addresses` 选地址，没有则 `delivery-create-address` 创建
7. 展示兑换确认单（商品、规格、消耗积分、兑后余额）→ **用户明确确认后** `mall-create-order`（skuId + spuCategory，实物必传 addressId）
   - 多个商品**必须分别下单且串行排队**，等前一单成功响应后再下一单
   - 下单结果关注 `status`（1 全部成功 / 2 部分成功 / 0 失败）和每个 orderItem 的 `orderItemStatus`
8. 兑换完成后用 `query-my-coupons` 确认券已入卡包（虚拟券场景）

### 场景二：积分抽奖

1. `query-lottery-info`（无参数）— 活动状态、单次消耗（drawPoint）、剩余次数、奖池列表、`drawDecision`
2. 向用户展示奖池 + **`drawDecision.nextConsumption.text`**（如"本次将消耗 24 积分"），**得到明确确认后**才可继续
3. `draw-lottery`（无参数）— 执行一次抽奖
4. 展示中奖结果；可用 `query-my-prizes` 查历史奖品（可用/已用/已过期）
   - 资格判断以 `drawDecision.resourceEligible` 和 `nextConsumption` 为准；不要因 `availableTimes=0/null` 就断定不能抽——混合规则下次数为 0 时仍可能消耗积分抽

### 场景三：兑换记录查询

1. `mall-order-list`（可选分页参数 lastId/size）— 商城订单列表
2. `mall-order-detail`（orderId）— 单笔详情；查完引导"您可以打开麦当劳 App 查看凭证等其他信息"
3. 注意：商城订单走 `mall-order-list`；点餐订单走 `order-list`/`query-order`，两者不同

## 关键约束与护栏

- **消耗积分必确认**：`mall-create-order`、`draw-lottery` 都会真实扣减积分，调用前必须展示消耗明细并获得用户明确确认，无一例外。
- **抽奖确认内容**：确认文案必须包含 `drawDecision.nextConsumption.text` 的原文（本次实际消耗什么、多少），不能只说"要抽奖吗"。
- **串行下单**：多件商品兑换逐单创建、逐单等待，禁止并发。
- **数据真实**：积分余额、商品价格、所需积分一律以接口返回为准；推荐排序的"积分价值比"要展示计算依据。
- **过期字段名**：注意账户返回里是 `currentMouthExpirePoint`/`nextMouthExpirePoint`（Mouth），解析时不要写成 Month。

## 输出格式建议

积分账户卡片：

```
💰 积分账户
- 可用积分：84.1
- 本月即将过期：12（⚠️ 建议尽快使用）
- 下月即将过期：0
```

兑换推荐表：

| 推荐 | 商品 | 所需积分 | 面值/价格 | 每积分价值 |
|---|---|---|---|---|
| ⭐ | xx 券 | 100 | ¥10 | 0.10 元 |
| | xx 周边 | 800 | ¥39 | 0.05 元 |

## 异常处理

- **401 / 429**：Token 失效提示到 https://open.mcd.cn/mcp 重新申请；限流稍后重试一次。
- **积分不足**：兑换前用 `query-my-account` 的 `availablePoint` 校验，不足时直接告知差额，不要发起下单。
- **无抽奖活动**：`activityStatusText` 非"进行中"时如实告知，展示活动起止时间。
- **抽奖/兑换失败**：原样转述返回的 message；不要重试写操作，先与用户确认。
- **商品已下架**：`mall-points-products` 列表可能变化，以下单时接口返回为准；失败则重新拉列表让用户改选。
