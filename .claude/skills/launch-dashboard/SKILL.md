---
name: launch-dashboard
description: Start the health web dashboard at localhost:3001 and open it in the browser.
allowed-tools: Bash
---

1. Kill any existing dashboard process:
```bash
pkill -f "tsx dashboard/server" 2>/dev/null; sleep 0.3
```

2. Start the dashboard server in the background:
```bash
cd /Users/yihuima/health-coach && npm run dashboard > /tmp/health-coach-dashboard.log 2>&1 &
```

3. Wait and open in browser:
```bash
sleep 2 && open http://localhost:3001
```

4. Confirm it's running:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
```

5. If HTTP status is 200: report **Health dashboard running at http://localhost:3001**

   If not 200, check the log:
```bash
tail -30 /tmp/health-coach-dashboard.log
```
   Then diagnose and fix (likely: `npm install` not run, or port 3001 already in use by another process).
