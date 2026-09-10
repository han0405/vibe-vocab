# Word pack: Backend / Distributed Systems

Copy this file's contents into `vocab-focus.md` in your project root to put these terms in Active mode.

| Term | Gloss | Meaning |
|---|---|---|
| idempotent | 幂等 | same request applied twice has the same effect as once |
| eventual consistency | 最终一致 | replicas converge given enough time, not immediately |
| cache penetration | 缓存穿透 | requests for non-existent keys bypass cache, hit the DB |
| cache avalanche | 缓存雪崩 | many keys expire at once, DB is flooded |
| cache stampede | 缓存击穿 | one hot key expires, many requests rebuild it at once |
| write-through / write-back | 直写 / 回写 | cache-write propagation strategies |
| back-pressure | 背压 | a slow consumer signals producers to slow down |
| circuit breaker | 熔断 | stop calling a failing dependency for a while |
| rate limiting | 限流 | cap requests per unit time |
| throttling | 节流 | deliberately slow down processing |
| bulkhead | 舱壁隔离 | isolate resources so one failure can't sink everything |
| graceful degradation | 优雅降级 | shed non-critical features under load |
| connection pool | 连接池 | reuse a fixed set of DB connections |
| N+1 query | N+1 查询 | one query per row instead of one batched query |
| optimistic / pessimistic locking | 乐观 / 悲观锁 | detect-on-write vs lock-on-read concurrency control |
| deadlock | 死锁 | two holders each wait on the other's lock |
| race condition | 竞态 | outcome depends on unpredictable timing |
| sharding | 分片 | split data horizontally across nodes |
| partition | 分区 | a subset of data or a network split |
| replication lag | 复制延迟 | followers trail the leader |
| quorum | 法定人数 | minimum nodes that must agree |
| leader election | 主节点选举 | pick one coordinator among peers |
| consensus | 共识 | nodes agree on one value (Raft, Paxos) |
| write-ahead log | 预写日志 | log the intent before applying it |
| exactly-once / at-least-once | 恰好一次 / 至少一次 | message delivery guarantees |
| dead-letter queue | 死信队列 | park messages that keep failing |
| fan-out | 扇出 | one event delivered to many consumers |
| service discovery | 服务发现 | find where a service instance is running |
| graceful shutdown | 优雅关闭 | drain in-flight work before exiting |
| connection draining | 连接排空 | stop new traffic, let existing finish |
