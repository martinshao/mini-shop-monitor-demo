# Mini Shop Monitor Demo

一个基于 monorepo 的轻量 C 端商城前端监控验证沙盒。

本项目借用 C 端商城的页面形态，模拟真实用户访问中常见的性能问题和稳定性问题，用于验证前端监控 SDK 从采集、上报、入库到控制台展示的完整闭环能力。

## 项目定位

这个项目不是完整商城，也不追求真实交易链路。它的核心目标是验证监控系统：

- C 端页面是否能真实触发性能与异常场景
- 监控 SDK 是否能准确采集相关数据
- 采集服务是否能接收、校验并存储数据
- 控制台是否能把问题以可观察、可定位的方式展示出来

## 当前关注范围

第一阶段聚焦两类能力：

- 性能监控：首屏性能、商品列表加载、图片资源加载、接口耗时
- 稳定性监控：JS Error、Promise Error、接口失败、资源加载失败、白屏

暂不纳入第一阶段的能力：

- 用户行为链路
- 购物车和下单支付
- 业务漏斗
- Session 回放
- 告警系统
- Sourcemap 解析
- 多环境发布体系

## 目标架构

```txt
轻量 C 端商城
  ↓
前端监控 SDK
  ↓
监控采集服务
  ↓
本地数据存储
  ↓
监控分析控制台
```

计划中的 monorepo 模块：

```txt
apps/
  shop-web              # 被监控的 C 端商城
  mock-api              # 商品与故障模拟 API
  monitor-collector     # 监控数据采集服务
  monitor-console       # 监控分析控制台

packages/
  monitor-sdk           # 前端监控 SDK
  shared                # 共享类型、事件协议、常量
```

## 当前项目结构

```txt
.
├── apps/
│   ├── mock-api/
│   ├── monitor-collector/
│   ├── monitor-console/
│   └── shop-web/
├── docs/
├── packages/
│   ├── monitor-sdk/
│   └── shared/
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 项目文档

为了方便 Codex 和开发者快速恢复上下文，项目文档按用途拆分：

- `.codex/PROJECT_CONTEXT.md`：Codex 重新进入项目时优先阅读的精简上下文
- `docs/design/project-design.md`：项目整体设计方案
- `docs/development/engineering-guide.md`：通用开发规范、最佳实践和验收标准
- `docs/modules/module-design.md`：monorepo 各应用和包的职责边界
- `docs/plans/implementation-plan.md`：分阶段、可执行的实践计划
- `docs/README.md`：文档索引

## 共享事件协议

当前 `packages/shared` 已定义第一版监控事件协议：

- `MonitorEvent`
- `MonitorEventPayload`
- `MonitorEventType`
- `MONITOR_EVENT_TYPES`
- `DEFAULT_APP_ID`
- `DEFAULT_ENV`
- `DEFAULT_RELEASE`

第一版事件类型包括：

```txt
performance.page
performance.api
performance.resource
error.js
error.promise
error.api
error.resource
error.blank_screen
```

## 本地开发

安装依赖：

```bash
pnpm install
```

类型检查：

```bash
pnpm typecheck
```

构建：

```bash
pnpm build
```

运行测试：

```bash
pnpm test
```

## 阶段规划

### 阶段 0：项目初始化

已完成：

- Git 初始化
- `.gitignore`
- pnpm workspace
- TypeScript 基础配置
- `packages/shared` 共享类型包

### 阶段 1：业务实验场

计划实现：

- `apps/shop-web`
- `apps/mock-api`
- 首页
- 商品列表页
- 商品详情页
- 故障实验页
- 可控慢接口、失败接口、异常数据和大列表数据

### 阶段 2：SDK 最小采集能力

计划实现：

- SDK 初始化
- 测试事件上报
- 页面性能采集
- API 耗时采集
- API 失败采集
- JS Error 采集
- Promise Error 采集
- 资源失败采集
- 白屏检测

### 阶段 3：采集服务与数据存储

计划实现：

- `apps/monitor-collector`
- `POST /api/events`
- SQLite 入库
- 基础查询接口
- 总览统计接口

### 阶段 4：监控控制台

计划实现：

- `apps/monitor-console`
- 总览视图
- 性能视图
- 接口视图
- 稳定性视图

## 设计原则

- 业务要轻
- 场景要真
- 故障要可控
- 指标要聚焦
- 链路要闭环
- 架构要可扩展
