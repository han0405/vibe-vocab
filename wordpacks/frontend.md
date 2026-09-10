# Word pack: Frontend / Web

Copy this file's contents into `vocab-focus.md` in your project root to put these terms in Active mode.

| Term | Gloss | Meaning |
|---|---|---|
| hydration | 注水 | attach JS behavior to server-rendered HTML |
| reconciliation | 协调 | diff the virtual tree against the previous one |
| memoization | 记忆化 | cache a result keyed by its inputs |
| debounce | 防抖 | fire only after input stops for N ms |
| throttle | 节流 | fire at most once per N ms |
| reflow / repaint | 重排 / 重绘 | layout recompute vs pixel redraw |
| critical rendering path | 关键渲染路径 | steps from bytes to first paint |
| code splitting | 代码分割 | ship JS in on-demand chunks |
| tree shaking | 摇树优化 | drop unused exports from the bundle |
| lazy loading | 懒加载 | load a resource only when needed |
| prefetch / preload | 预取 / 预加载 | fetch a resource before it's requested |
| render-blocking | 渲染阻塞 | resource that delays first paint |
| layout shift | 布局偏移 | content jumps as things load (CLS) |
| stale-while-revalidate | 陈旧再验证 | serve cached data, refresh in background |
| optimistic update | 乐观更新 | update UI before the server confirms |
| controlled / uncontrolled component | 受控 / 非受控 | state lives in React vs in the DOM |
| prop drilling | 逐层传参 | passing props through many layers |
| portal | 传送门 | render children outside the parent DOM node |
| suspense boundary | 悬挂边界 | where a loading fallback is shown |
| event delegation | 事件委托 | one listener on a parent for many children |
| shadow DOM | 影子 DOM | encapsulated subtree with scoped styles |
| viewport | 视口 | the visible area of the page |
| accessibility (a11y) | 无障碍 | usable with assistive tech |
| focus trap | 焦点锁定 | keep keyboard focus inside a modal |
| CSS specificity | 优先级 | which rule wins when selectors conflict |
| stacking context | 层叠上下文 | scope for z-index ordering |
| repaint budget | 重绘预算 | frame time available for rendering work |
| server-side rendering (SSR) | 服务端渲染 | build HTML on the server per request |
| static site generation (SSG) | 静态生成 | build HTML at build time |
| progressive enhancement | 渐进增强 | works without JS, better with it |
