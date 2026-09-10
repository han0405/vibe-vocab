# Word pack: DevOps / Infrastructure

Copy this file's contents into `vocab-focus.md` in your project root to put these terms in Active mode.

| Term | Gloss | Meaning |
|---|---|---|
| idempotent (infra) | 幂等 | re-running the same config yields the same state |
| declarative / imperative | 声明式 / 命令式 | describe the end state vs the steps |
| drift | 配置漂移 | live state diverges from the declared state |
| blue-green deployment | 蓝绿部署 | switch traffic between two identical environments |
| canary release | 金丝雀发布 | roll out to a small slice first |
| rolling update | 滚动更新 | replace instances a few at a time |
| rollback | 回滚 | revert to the previous known-good version |
| immutable infrastructure | 不可变基础设施 | replace servers instead of mutating them |
| provisioning | 置备 | create and configure resources |
| orchestration | 编排 | coordinate many containers/services |
| service mesh | 服务网格 | sidecar layer handling service-to-service traffic |
| ingress / egress | 入站 / 出站 | traffic into vs out of the cluster |
| load balancer | 负载均衡 | spread traffic across backends |
| health check / readiness / liveness | 健康检查 / 就绪 / 存活 | is it up, can it serve, is it alive |
| autoscaling | 自动伸缩 | add/remove capacity based on load |
| horizontal / vertical scaling | 水平 / 垂直扩展 | more instances vs bigger instances |
| observability | 可观测性 | infer internal state from outputs |
| metrics / logs / traces | 指标 / 日志 / 链路 | the three telemetry pillars |
| SLI / SLO / SLA | 服务水平指标 / 目标 / 协议 | measured, targeted, contracted reliability |
| error budget | 错误预算 | allowed unreliability before you stop shipping |
| toil | 重复劳动 | manual, repetitive, automatable ops work |
| infrastructure as code | 基础设施即代码 | manage infra through version-controlled files |
| artifact | 制品 | a built, versioned output (image, binary, package) |
| pipeline | 流水线 | automated build → test → deploy stages |
| secret management | 密钥管理 | store and inject credentials safely |
| least privilege | 最小权限 | grant only the access actually needed |
| chaos engineering | 混沌工程 | inject failure on purpose to test resilience |
| cold start | 冷启动 | latency when a scaled-to-zero instance wakes |
| reverse proxy | 反向代理 | server-side proxy in front of backends |
| container registry | 镜像仓库 | store and distribute container images |
