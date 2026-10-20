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

## 价格与单位口径（均为实测确认）

**两个接口的金额单位不同，差 100 倍，混用必出事故：**

| 接口 | 相关字段 | 单位 | 实测样例 |
|---|---|---|---|
| `query-meals` | `currentPrice` / `originalPrice` | **元** | 麦辣鸡腿汉堡 `"22.5"`、圆筒冰淇淋 `"5"`、可乐 `"9.5"` |
| `calculate-price` | `price` / `originalPrice` / `discount` / `productPrice` / `subtotal` 等 | **分** | 同一组合 `"price": 3490`（= 34.9 元） |

- `query-meals` 的价格**已经是元，直接展示，禁止再 ÷100**。
- `calculate-price` 的价格**是分，展示前必须 ÷100**。
- 交叉校验：同一商品应满足 `query-meals.currentPrice === calculate-price.productOriginalPrice / 100`。实测 1440 麦辣鸡腿汉堡 `22.5` ↔ `2250` 分，完全吻合。
- **`enjoyed` / `enjoyable` 内部还是混合单位**：`realDiscount` 单位是**元**，同级的 `balance` 单位是**分**。不要整块按同一单位处理。
- 价格与数量在比较/累加前统一转 number（部分是字符串数字）。

**券接口的实测差异：**

- **`query-store-coupons` 返回结构化 JSON**：`title` / `couponId` / `couponCode` / `tradeDateTime` / `products[].productCode` / `promotionId`。同一 `couponId` 可对应多个 `couponCode`，展示按 `couponId` 分组。用券入参只能取自这里。
- **`query-my-coupons` 返回渲染好的 Markdown 文本，不是结构化 JSON**：
  - **拿不到 `couponId` / `couponCode`**，不能作为用券入参来源。
  - **不存在 `instructions.availableTime` 字段**。时段/渠道看 Markdown 的「有效期」「标签」两行。

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
5. `query-store-coupons`（**必传** `storeCode` + `orderType` + `beType`，`beCode` 按 beType 规则传）— 查该门店该订单类型下**真正可用**的券。这是唯一可靠的用券来源，`couponId`/`couponCode` 从这里取。
   - `storeCode` 必须全部由数字组成，传之前校验一下
   - 券自带 `products[].productCode`（适用商品编码）。实测存在**券绑定商品不在该门店 `query-meals` 菜单里**的情况（如「19.9元王牌炸鸡任选2」绑定的 `9900016534` 就查不到），用这类券时先用 `productCode` 反查菜单确认能下单，查不到就提示用户该券可能不适用于此门店
6. `query-my-coupons`（可选 `page`/`pageSize`）— 查用户卡包全部券，**仅作补充展示**
   - 此接口不做门店/渠道校验，"可用"只代表在卡包里，不代表当前订单能用
   - 实测返回为 **Markdown 文本**（含「优惠」「有效期」「领取时间」「标签」），**拿不到 `couponId`/`couponCode`**，不要把它当作下单用券的入参来源

### 第四步：选品与试算

7. `query-meals`（**必传** `storeCode` + `orderType` + `beType`；预约传 `reservationDate`）— 获取该门店在售餐品及价格，结合用户偏好（辣/不辣、汉堡/小食/饮料）圈定候选商品，记下 `productCode`
   - 返回是**两段式结构，不是扁平数组**：
     - `data.categories[]`：`{ name, meals: [{ code, tags }] }` —— 决定分类与展示顺序，只给编码
     - `data.meals`：**以 `productCode` 为 key 的映射表**，`{ [code]: { name, image, currentPrice, originalPrice, discountType, canWithOrder, withOrder } }`
   - 取商品名与价格：先由 `categories[].meals[].code` 拿编码，再去 `data.meals[code]` 取详情
   - `data.frequent` 是「我的常点」，**单个对象不是数组**，可作首选推荐
   - ⚠️ **`currentPrice` 可能是有条件的优惠价**：当 `discountType === "随单购麦金卡优惠"` 且 `canWithOrder === true` 时，该现价**必须同时购买随单购（麦金卡）才成立**，否则按 `originalPrice` 结算。实测「全明星双人分享餐八件套」`currentPrice` 49.9 / `originalPrice` 114.5，不做随单购就差 64.6 元。报价前必须判断 `discountType`，否则会把价格报低一半
   - `withOrder` 返回的是 `{ membershipCode, specId }`，而 `calculate-price` 入参要的是 `{ cardId, cardType, membershipCode, membershipSpecId }` —— **`specId` 要映射成 `membershipSpecId`**，且 `cardId`/`cardType` 在菜单里拿不到，需从别处补
8. `query-meal-detail`（+ 商品 `code`）— 需要查看套餐组成或做特制（去酱、加菜等）时调用；特制项的 `selectedKey`/`unselectedKey` 规则必须严格按工具说明传递
9. `calculate-price` — **对 2~3 套候选组合分别试算**：
   - **必传**：`storeCode` + `orderType` + `beType`（缺一即报错）；得来速/外送/团餐另需 `beCode`
   - 预约场景传 `reservationDate`（格式 `yyyy-MM-dd HH:mm`），即时单不传
   - `items[]`：`productCode` + `quantity`（≥1，整型）+ 可选 `couponId`/`couponCode`（**取自 `query-store-coupons`**，不要用 `query-my-coupons` 的展示文案去凑）
   - 需特制时传 `modification.values[]`，`key` 严格按 `query-meal-detail` 的 `selectedKey`/`unselectedKey` 规则
   - 返回金额单位为**分**，展示时 ÷100 转元
   - 返回结构（已实测）：

     | 字段 | 类型 | 单位 | 说明 |
     |---|---|---|---|
     | `productOriginalPrice` | integer | 分 | 商品原价合计 |
     | `productPrice` | integer | 分 | 商品现价合计 |
     | `originalPrice` | integer | 分 | 订单原价（含运费/打包费） |
     | `discount` | integer | 分 | 优惠金额 |
     | `price` | integer | 分 | 应付现价 |
     | `productList[]` | array | 分 | `{productCode, productName, quantity, originalSubtotal, subtotal}` |
     | `takeWayList[]` | array | — | `{code, title, subtitle}` 取餐方式选项 |
     | `deliveryPrice` / `packingPrice` / `tablewarePrice` | integer | 分 | 外送费 / 打包费 / 餐具费 |
     | `enjoyed` / `enjoyable` | object | **混合** | `realDiscount` 是**元**，`balance` 是**分** |

   - ⚠️ **`productList` 顺序不保证与传入 `items` 一致**（实测传入 1440 → 4810 → 可乐，返回顺序为 4810 → 可乐 → 1440）。必须按 `productCode` 匹配，**不能按下标取**
   - **`takeWayList[]` 实测值**：到店场景返回 `code: "eat-in"`（堂食/店内用餐）与 `code: "locker-out"`（外带/店外取餐柜）两项
   - **`takeWayCode` 要让用户选，不要默认取第一个**：展示每项的 `title` + `subtitle`，用户确认后传对应 `code` 给 `create-order`

### 第五步：确认下单

10. 输出方案对比表 → **等用户明确确认某一套方案后**才调用 `create-order`
    - 到店：`orderType=1` + `takeWayCode`（必传）
    - 外送：`orderType=2` + `addressId`（必传），引导用户填写 `remark`（如"无接触配送"）
    - 下单后引导用户："通过支付链接扫码或打开麦当劳 App 完成支付，支付完成后回复'支付完成'或'支付失败'"
11. 用户反馈支付结果后用 `query-order`（orderId）查询最新订单状态；用户反悔则用 `cancel-order`（orderId + cancelReasonCode，先确认原因）

## 关键约束与护栏

- **下单确认红线**：`create-order` 前必须把方案（商品明细、数量、用券、券后价、门店、取餐方式）完整展示给用户，得到"就这套/下单"等明确确认后才可调用。未确认绝不下单。
- **券限制校验**：券常有适用时段、适用渠道（仅到店/仅外送）、门槛金额限制。**两个券接口要互补使用**：
  - `query-store-coupons` 的 `tradeDateTime` 只给绝对时间段（如 `2026-10-19 10:30:00-2026-10-23 23:59:59`），**不含星期规则**；
  - 星期/时段细则只在 `query-my-coupons` 的 Markdown「有效期」行里（实测形如 `... 周一、二、三、四、五 10:30-23:59`），渠道看「标签」行（如「到店专用」「外送专用」）。
  - 结论：**门店+订单类型可用性以 `query-store-coupons` 为准，星期/时段细则去卡包文案里核对**。两边都没有 `instructions.availableTime` 这类结构化字段。
- **用券入参来源**：`couponId`/`couponCode` 只能取自 `query-store-coupons`。卡包接口的展示文案不含券 id，不要从中推断或拼凑。
- **价格单位（高频事故点）**：`query-meals` 是**元**、`calculate-price` 是**分**，差 100 倍。禁止把两者直接相加或比较；对比表统一用元，`calculate-price` 的结果先 ÷100。`enjoyed`/`enjoyable` 内部 `realDiscount` 是元而 `balance` 是分，逐字段确认。
- **现价先看 `discountType`**：`query-meals` 的 `currentPrice` 若标注「随单购麦金卡优惠」，必须买随单购才成立，否则按 `originalPrice` 报。
- **一个方案一张券**：同一商品行只挂一张券；多张券分摊到不同商品行试算。
- **营养与供应**：商品是否在售以 `query-meals` 实时结果为准，不要凭记忆编造商品和价格。

## 输出格式建议

方案对比表（Markdown 表格）：

| 方案 | 组成 | 原价 | 用券 | 券后价 | 节省 |
|---|---|---|---|---|---|
| A | 麦辣鸡腿汉堡+中薯+可乐 | ¥45.5 | 11.9元麦辣鸡腿堡券 | ¥34.9 | ¥10.6 |
| B | ... | ... | ... | ... | ... |

（上例为上海人民广场店实测：原价 4550 分、券后 3490 分，均按 ÷100 折成元展示。）

表后附一句推荐语（如"方案 A 最省，方案 B 多一杯饮料更适合两人分"），最后明确问用户选哪套；到店场景还要问清堂食还是外带。

## 异常处理

- **401**：Token 无效或过期 → 提示用户到 https://open.mcd.cn/mcp 重新申请 Token 并更新配置，停止后续调用。
- **429**：触发限流（600 次/分钟）→ 暂停片刻后重试一次；仍失败则告知用户稍后重试，保留已算出的方案。
- **无门店**：`query-nearby-stores` 无结果 → 换一个更精确的关键词/城市重试；`delivery-query-stores` 无结果 → 告知该地址暂不支持配送，建议改用到店自取。
- **无可用券**：`query-store-coupons` 为空 → 直接按原价试算，并在对比表中注明"当前门店无可用券"。
- **券商品不在菜单**：券的 `products[].productCode` 在 `query-meals` 里查不到 → 提示该券可能不适用于此门店，换券或换店，**不要硬拼 productCode 下单**。
- **售罄/餐段不符**：早餐类商品在正餐时段可能不在售，以 `query-meals` 返回为准，缺货时推荐同类替代。
- **价格量级异常**：若对比表出现明显不合理的数字（如单人餐 ¥1350），八成是单位没换算，回查该值来自 `query-meals`（元）还是 `calculate-price`（分）。
