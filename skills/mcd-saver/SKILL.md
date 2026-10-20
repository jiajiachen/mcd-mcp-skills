---
name: mcd-saver
description: 麦当劳省钱凑单引擎。当用户想点麦当劳并提到预算、人数、省钱、优惠、凑单、怎么点最划算、用券下单等诉求时使用。覆盖到店自取与麦乐送外送两种场景，自动领券、盘点可用券、多套组合试算比价，用户确认后才下单。
---

# mcd-saver 省钱凑单引擎

## 能力概述

根据用户给出的预算、人数、口味偏好，自动完成「找门店 → 领券 → 盘点券 → 选品 → 多方案试算比价 → 确认下单」的完整闭环，输出直观的方案对比表，让用户花最少的钱吃到想吃的组合。

## 触发场景

- "两个人 50 块吃麦当劳，怎么点最划算？"
- "帮我凑个 30 块以内的早餐"
- "附近有麦当劳吗，用券点一单麦辣鸡腿堡"
- "点麦乐送到公司，越省越好"

## 工具调用链

### 第一步：确认时间（可选但推荐）

1. `now-time-info` — 获取服务器当前时间。用于判断餐段（早餐/正餐）、校验券的可用时段、以及预约场景的时间格式。

### 第二步：确定门店（按场景二选一）

**到店自取（beType=1）：**

2. `query-nearby-stores`，参数：
   - `beType=1`（到店自提；车道取餐则 `beType=5`，且后续所有调用必须带返回的 `beCode`）
   - `searchType=2` 按位置搜索（此时 `city`、`keyword` 必填，来自用户输入，如「上海市」「人民广场」）；`searchType=1` 查收藏门店（无收藏时会报错，回退到 `searchType=2`）
   - 让用户从返回列表中选定一家，记下 `storeCode`（及 beType=5 时的 `beCode`）

**麦乐送外送（beType=2）：**

2. `delivery-query-addresses` — 查询用户配送地址列表，让用户选一个，记下 `addressId`；没有地址则引导用户后用 `delivery-create-address` 创建
3. `delivery-query-stores`，参数 `addressId` + `beType=2` → 获取可配送门店，记下 `storeCode` 和 `beCode`

> 后续所有工具统一规则：到店自取 orderType=1、不传 beCode；得来速 orderType=1、必传 beCode；麦乐送/团餐 orderType=2、必传 beCode。

### 第三步：一键领券 + 盘点

4. `auto-bind-coupons` — 自动领取当前所有可领的券（无需参数，无副作用风险，但属于"领取"动作，执行前告知用户一声）
5. `query-store-coupons`（storeCode + orderType + beType + beCode?）— 查该门店该订单类型下**真正可用**的券
6. `query-my-coupons` — 查用户卡包全部券（注意：此接口不做门店/渠道校验，仅作补充展示；能否用于当前订单以 `query-store-coupons` 为准）

### 第四步：选品与试算

7. `query-meals`（storeCode + orderType + beType）— 获取该门店在售餐品及价格，结合用户偏好（辣/不辣、汉堡/小食/饮料）圈定候选商品，记下 `productCode`
8. `query-meal-detail`（+ 商品 `code`）— 需要查看套餐组成或做特制（去酱、加菜等）时调用；特制项的 `selectedKey`/`unselectedKey` 规则必须严格按工具说明传递
9. `calculate-price` — **对 2~3 套候选组合分别试算**：
   - `items[]`：`productCode` + `quantity` + 可选 `couponId`/`couponCode`（从第三步的可用券中取）
   - 返回价格单位为**分**，展示时除以 100 转为元
   - 记住返回的 `data.takeWayList[].code`，到店下单时 `takeWayCode` 必传

### 第五步：确认下单

10. 输出方案对比表 → **等用户明确确认某一套方案后**才调用 `create-order`
    - 到店：`orderType=1` + `takeWayCode`（必传）
    - 外送：`orderType=2` + `addressId`（必传），引导用户填写 `remark`（如"无接触配送"）
    - 下单后引导用户："通过支付链接扫码或打开麦当劳 App 完成支付，支付完成后回复'支付完成'或'支付失败'"
11. 用户反馈支付结果后用 `query-order`（orderId）查询最新订单状态；用户反悔则用 `cancel-order`（orderId + cancelReasonCode，先确认原因）

## 关键约束与护栏

- **下单确认红线**：`create-order` 前必须把方案（商品明细、数量、用券、券后价、门店、取餐方式）完整展示给用户，得到"就这套/下单"等明确确认后才可调用。未确认绝不下单。
- **券限制校验**：优惠券常有适用时段（如仅工作日 10:30 后）、适用渠道（仅到店/仅外送）、门槛金额限制。选券时以 `query-store-coupons` 返回的当前门店可用券为准，`query-my-coupons` 里 `instructions.availableTime` 字段可用于核对时段。
- **价格单位**：`calculate-price` 返回金额单位是分，对比表必须换算成元。
- **一个方案一张券**：同一商品行只挂一张券；多张券分摊到不同商品行试算。
- **营养与供应**：商品是否在售以 `query-meals` 实时结果为准，不要凭记忆编造商品和价格。

## 输出格式建议

方案对比表（Markdown 表格）：

| 方案 | 组成 | 原价 | 用券 | 券后价 | 节省 |
|---|---|---|---|---|---|
| A | 麦辣鸡腿堡+中薯+可乐中杯 | ¥xx | 11.9元麦辣鸡腿堡券 | ¥xx | ¥xx |
| B | ... | ... | ... | ... | ... |

表后附一句推荐语（如"方案 A 最省，方案 B 多一杯饮料更适合两人分"），最后明确问用户选哪套。

## 异常处理

- **401**：Token 无效或过期 → 提示用户到 https://open.mcd.cn/mcp 重新申请 Token 并更新配置，停止后续调用。
- **429**：触发限流（600 次/分钟）→ 暂停片刻后重试一次；仍失败则告知用户稍后重试，保留已算出的方案。
- **无门店**：`query-nearby-stores` 无结果 → 换一个更精确的关键词/城市重试；`delivery-query-stores` 无结果 → 告知该地址暂不支持配送，建议改用到店自取。
- **无可用券**：`query-store-coupons` 为空 → 直接按原价试算，并在对比表中注明"当前门店无可用券"。
- **售罄/餐段不符**：早餐类商品在正餐时段可能不在售，以 `query-meals` 返回为准，缺货时推荐同类替代。
