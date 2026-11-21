# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/kurodo-ai/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/kurodo-ai/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar prices protocols that have no token yet. It derives market-cap/TVL multiples per line of business from the snapshot's own trading protocols, shrinks them toward the global median in log space, and adjusts each tokenless protocol for seven-day momentum, maturity, chain breadth and TVL scale — then ranks the full watchlist plus the strongest early protocols below the floor, each with a concrete farm plan that names chains, capital, costs and time. The dashboard is a static, offline board: sortable and filterable, with a per-protocol detail view that shows the model's whole calculation and a Live view that sets already-trading protocols aside.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=gzzxjh8r&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
