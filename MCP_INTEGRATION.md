# MCP 接入说明：麦当劳中国 MCP Server

本文档说明 mcd-mcp-skills 所依赖的麦当劳中国 MCP Server 的接入方式、35 个工具的全景分组、各 Skill 的工具映射，以及典型调用时序。

## 接入方式

| 项 | 值 |
|---|---|
| 端点 | `https://mcp.mcd.cn` |
| 协议 | MCP Streamable HTTP（POST JSON-RPC 2.0） |
| 鉴权 | 请求头 `Authorization: Bearer <token>`（Token 申请：https://open.mcd.cn/mcp ） |
| 请求头 | `Content-Type: application/json`、`Accept: application/json, text/event-stream` |
| 会话 | `initialize` 后即可直接 `tools/call`；如响应头携带 `Mcp-Session-Id`，后续请求需回传 |
| 限流 | 600 次/分钟/Token，超限返回 HTTP 429 |
| 认证失败 | HTTP 401（Token 无效或过期） |

实测注意：

- 服务端可能直接返回 `application/json`，也可能返回 `text/event-stream`（SSE），客户端实现需兼容两种（`auto-routine.mjs` 已处理）。
- 401 认证失败时响应体可能是纯文本（如"当前鉴权码不存在或已失效!"）而非 JSON，客户端解析错误响应时不要假设 JSON 格式。
- 派对日期/场次工具的实际名称是 `query-party-store-date` 和 `query-party-store-session`（官方文档表格中曾写作 `query-partystore-date/session`，以 `tools/list` 实测结果为准）。
- 价格类字段单位为**分**，展示时需换算为元。
- 积分账户返回字段中"本月过期"拼写为 `currentMouthExpirePoint`（Mouth）。

## 35 个工具全景（按场景分组）

### 点餐交易（8）

| 工具 | 说明 | 读/写 |
|---|---|---|
| `query-nearby-stores` | 到店场景查询可点餐门店（beType=1 到店自提 / 5 得来速） | 读 |
| `query-meals` | 门店在售餐品列表 | 读 |
| `query-meal-detail` | 餐品详情与特制选项（selectedKey/unselectedKey） | 读 |
| `calculate-price` | 价格试算（含优惠），返回 takeWayList | 读 |
| `create-order` | 创建订单（到店/外送） | **写** |
| `cancel-order` | 取消订单（非商城） | **写** |
| `order-list` | 历史订单列表（非商城） | 读 |
| `query-order` | 订单详情/配送进度 | 读 |

### 优惠券（4）

| 工具 | 说明 | 读/写 |
|---|---|---|
| `available-coupons` | 当前可领取的券列表 | 读 |
| `auto-bind-coupons` | 一键领取全部可领的券 | **写（领券）** |
| `query-my-coupons` | 卡包券资产（不做门店/渠道校验） | 读 |
| `query-store-coupons` | 指定门店+订单类型下可用的券 | 读 |

### 营养（1）

| 工具 | 说明 | 读/写 |
|---|---|---|
| `list-nutrition-foods` | 全量餐品营养成分（能量/蛋白质/脂肪/碳水/钠/钙） | 读 |

### 积分商城（5）

| 工具 | 说明 | 读/写 |
|---|---|---|
| `query-my-account` | 积分账户（可用/本月过期/下月过期） | 读 |
| `mall-points-products` | 积分商城可兑换商品列表（catRuleIds 类目筛选） | 读 |
| `mall-product-detail` | 商品详情与 SKU（区分 shopId=2 兑换 / shopId=5 活动） | 读 |
| `mall-create-order` | 积分兑换下单（仅 shopId=2，多商品需串行分单） | **写（扣积分）** |
| `mall-order-list` / `mall-order-detail` | 商城订单列表 / 详情 | 读 |

### 抽奖（3）

| 工具 | 说明 | 读/写 |
|---|---|---|
| `query-lottery-info` | 抽奖活动信息与 drawDecision 消耗决策 | 读 |
| `draw-lottery` | 执行一次抽奖（须先展示 nextConsumption 并获确认） | **写（扣积分/次数）** |
| `query-my-prizes` | 我的奖品列表 | 读 |

### 活动日历与时间（2）

| 工具 | 说明 | 读/写 |
|---|---|---|
| `campaign-calendar` | 当月营销活动日历 | 读 |
| `now-time-info` | 服务器当前时间 | 读 |

### 派对活动（5）

| 工具 | 说明 | 读/写 |
|---|---|---|
| `query-party-city` | 活动开放城市列表（需 spuId） | 读 |
| `query-party-store` | 城市下支持活动的门店 | 读 |
| `query-party-store-date` | 门店可预约日期 | 读 |
| `query-party-store-session` | 指定日期的场次（时间/余位） | 读 |
| `party-order-create` | 创建派对订单（仅 shopId=5） | **写** |

### 门店地址（3）

| 工具 | 说明 | 读/写 |
|---|---|---|
| `delivery-query-addresses` | 配送地址列表 | 读 |
| `delivery-create-address` | 新建配送地址 | **写** |
| `delivery-query-stores` | 地址可配送门店（beType=2 麦乐送 / 6 团餐） | 读 |

### 企业团餐（2）

| 工具 | 说明 | 读/写 |
|---|---|---|
| `query-meal-assistance` | 团餐助餐服务（calculate-price 前调用） | 读 |
| `query-promotions` | 团餐促销规则（满减/满折） | 读 |

### 其他（2）

| 工具 | 说明 | 读/写 |
|---|---|---|
| `query-survey-coupon` | 按订单号查满意度答卷及关联奖券 | 读 |
| `available-coupons` 等 | （见优惠券组） | — |

## Skill × 工具映射表

| 工具 | saver | nutritionist | party-planner | points-manager | auto-routine |
|---|:-:|:-:|:-:|:-:|:-:|
| now-time-info | ✅ | ✅ | | | |
| query-nearby-stores | ✅ | ✅ | | | |
| delivery-query-addresses | ✅ | ✅ | | ✅(实物) | |
| delivery-create-address | ✅ | ✅ | | ✅(实物) | |
| delivery-query-stores | ✅ | ✅ | | | |
| auto-bind-coupons | ✅ | | | | ✅ |
| available-coupons | ✅ | | | | |
| query-store-coupons | ✅ | | | | |
| query-my-coupons | ✅ | | | ✅ | |
| query-meals | ✅ | ✅ | | | |
| query-meal-detail | ✅ | ✅ | | | |
| calculate-price | ✅ | ✅ | | | |
| create-order | ✅ | ✅(可选) | | | |
| cancel-order | ✅ | | | | |
| order-list / query-order | ✅ | | | | |
| list-nutrition-foods | | ✅ | | | |
| mall-points-products | | | ✅ | ✅ | |
| mall-product-detail | | | ✅ | ✅ | |
| mall-create-order | | | | ✅ | |
| mall-order-list / mall-order-detail | | | | ✅ | |
| query-my-account | | | | ✅ | ✅ |
| query-lottery-info | | | | ✅ | ✅ |
| draw-lottery | | | | ✅ | ✅(--draw) |
| query-my-prizes | | | | ✅ | |
| campaign-calendar | | | | | ✅ |
| query-party-city | | | ✅ | | |
| query-party-store | | | ✅ | | |
| query-party-store-date | | | ✅ | | |
| query-party-store-session | | | ✅ | | |
| party-order-create | | | ✅ | | |

（企业团餐的 `query-meal-assistance`/`query-promotions` 可作为 mcd-saver 的扩展场景，beType=6 时在 calculate-price 前调用。）

## 典型调用时序：省钱凑单（mcd-saver）

```
用户: "两个人 60 块预算，人民广场附近，到店自取，怎么点最划算？"

Agent                MCP Server (mcp.mcd.cn)
  │                        │
  ├─ now-time-info ───────▶│  确认当前时间/餐段
  │                        │
  ├─ query-nearby-stores ─▶│  beType=1, searchType=2,
  │                        │  city="上海市", keyword="人民广场"
  │◀── 门店列表 ───────────┤  → 用户选定 → storeCode
  │                        │
  ├─ auto-bind-coupons ───▶│  一键领取全部可领券
  ├─ query-store-coupons ─▶│  该门店到店单可用券
  ├─ query-my-coupons ────▶│  卡包券盘点（补充）
  │                        │
  ├─ query-meals ─────────▶│  门店在售餐品 → productCode
  ├─ query-meal-detail ───▶│  （可选）套餐组成/特制
  │                        │
  ├─ calculate-price ─────▶│  方案 A（含券）
  ├─ calculate-price ─────▶│  方案 B（含券）
  ├─ calculate-price ─────▶│  方案 C（原价对照）
  │                        │
  │  输出对比表（原价/券后/节省），等待用户确认
  │                        │
  ├─ create-order ────────▶│  仅用户明确确认后调用
  │                        │  （orderType=1 + takeWayCode）
  │◀── 订单 + 支付引导 ────┤
  │                        │
  ├─ query-order ─────────▶│  用户回复支付结果后查状态
```

## 业务价值

- **对用户**：把"打开 App → 找券 → 凑单 → 比价 → 下单"这条 10 分钟的路径压缩成一句话；积分临期、活动日历、抽奖机会不再错过。
- **对 Agent 生态**：提供一套完整的"真实交易型 MCP Server 如何写 Skill"范本——写操作确认红线、参数溯源（beType/beCode/orderType 传递规则）、单位换算（分→元）、限流退避，都是可直接复用的工程实践。
- **对麦当劳场景**：覆盖点餐、优惠、营养、积分、活动、派对六大业务域，35 个工具全部有组织地纳入 Agent 可调用的工作流。
