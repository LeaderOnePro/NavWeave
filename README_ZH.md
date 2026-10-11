# NavWeave

**NavWeave 是面向 MAVLink 工作流的地图优先任务规划 Harness。**

```text
NavWeave 负责任务规划与预览；
mavctl 负责安全执行。
```

NavWeave 是 [mavctl](https://github.com/LeaderOnePro/mavctl)（headless、
Agent 优先的 ArduPilot 地面站 CLI）的独立规划端伴生项目。NavWeave 拥有
规划侧：地图风格的画布式任务编辑、Mission JSON v1 校验、预览与导出。
mavctl 拥有执行侧：MAVLink、安全护栏、mission 线路协议与载具安全。

```text
┌──────────────────────────────┐
│  NavWeave（本仓库）           │
│  规划 · 校验 · 预览 ·         │
│  导出 · dry-run 审阅          │
└──────────────┬───────────────┘
               │  Mission JSON v1 文件 / mavctl dry-run（显式开启）
               ▼
┌──────────────────────────────┐
│  mavctl CLI + daemon         │
│  护栏 · MAVLink · ACK        │
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│  ArduPilot 载具               │
└──────────────────────────────┘
```

## 状态：POC（v0），仅 Mock/SITL 规划

| 已实现 | 未实现 |
| --- | --- |
| 离线 SVG 任务画布（坐标网格、home/vehicle/waypoint 标记、航线折线） | 在线地图瓦片 / 卫星图 / 地图搜索 |
| 点击添加航点、选中、删除、重排（按钮） | 航点拖拽排序 |
| 全局高度 + 单航点 hold / acceptance radius 编辑 | 区域 survey / polygon 覆盖规划 |
| 与 mavctl 规则一致的 Mission JSON v1 校验 | MAVLink 线路编码（永远不做——线路归 mavctl） |
| JSON 预览 + 导入/导出（`mission.json`） | 执行类命令：非 dry-run 的 `mission upload`、`mission start`、`mission clear` |
| mavctl dry-run 校验桥（默认 Mock，本地模式需显式开启） | 基于 health 的 gating、agent 聊天 / LLM 集成 |
| Mock 载具状态面板（明确标注 **Mode: Mock**） | 多用户、登录、数据库、云部署 |
| 每屏可见的安全横幅 | 任何形式的真机支持 |

## 安全声明

- **NavWeave 不直接说 MAVLink**，也不 import pymavlink。
- **NavWeave 不控制真实飞机。** POC 仅面向 mock 数据与 SITL 规划工作流。
- **NavWeave v0 不执行 upload/start。** 它导出 Mission JSON v1，并且只能
  通过显式开启的本地桥做 **dry-run 校验**。执行永远属于 mavctl。
- mavctl 的护栏、ACK 处理与 mission 协议是安全权威；NavWeave 刻意不
  重新实现其中任何一部分。

## 界面（ASCII 示意）

```text
┌ NavWeave — Mission Planning ──────────────────────────────────────┐
│ ⚠ Mock / SITL planning only. NavWeave does not execute flight …   │
│                          │  Vehicle: Mode Mock · connected ·      │
│   ┌──────────────────┐   │  GUIDED · rtk_fixed                    │
│   │ 坐标网格          │   │  Home: -35.3632, 149.1652              │
│   │  ▲ home          │   │                                        │
│   │   o──o 航点       │   │  航点列表                               │
│   │   ╲│  航线折线     │   │   1 takeoff  alt 10 m        [↑][↓][×] │
│   │    o o           │   │   2 waypoint alt 10 m hold 0 [↑][↓][×] │
│   └──────────────────┘   │   3 rtl                                │
│  点击网格 = 添加航点       │  [导出 mission.json] [Dry-run ▶]       │
└──────────────────────────┴──┴───────────────────────────────┴─────┘
```

## Mission JSON v1 示例

NavWeave 生成的正是 mavctl 消费的格式：

```json
{
  "version": 1,
  "items": [
    { "type": "takeoff", "altitude_m": 10 },
    {
      "type": "waypoint",
      "lat_deg": -35.3632,
      "lon_deg": 149.1652,
      "altitude_m": 10,
      "hold_s": 0,
      "accept_radius_m": 0
    },
    { "type": "rtl" }
  ]
}
```

校验规则与 mavctl 的 Mission JSON v1 一致（takeoff 必须在最前、
`land`/`rtl` 终止、最多 100 项、严格字段集、数值范围有限）。

## 本地开发

需要 Node 20+ 与 [pnpm](https://pnpm.io)。

```bash
pnpm install
pnpm dev         # 离线规划 UI：http://localhost:5173（Mock Mode）
pnpm test        # Vitest 单元/组件测试
pnpm lint        # ESLint（flat config）
pnpm typecheck   # tsc --noEmit（strict）
pnpm build       # typecheck + 生产构建
```

默认桥模式为 **Mock**——不会调用 mavctl 二进制。若要用本地 mavctl 审阅
任务（仅 dry-run），在 bridge 面板显式开启 **Local dry-run mode**；此后
NavWeave 只会对一个临时文件运行
`mavctl mission upload <temp-file> --confirm --dry-run --json`，临时文件
随后删除。任何内容都不会被上传。

## 与 mavctl 的关系

- mavctl 是执行层，也是 schema 权威（见 [MAVCTL_CONTRACT.md](docs/MAVCTL_CONTRACT.md)）。
- NavWeave 把 mavctl CLI 当作外部进程消费——从不链接 mavctl 代码、从不
  打开 MAVLink 连接、从不 import pymavlink。
- mavctl 不存在时，NavWeave 在 Mock Mode 下仅用本地校验继续工作。

## 许可证

MIT — 见 [LICENSE](LICENSE)。
