const { spawn } = require("child_process"); const fs = require("fs");
const [out, html, size] = process.argv.slice(2);
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const p = spawn(chrome, ["--headless=new","--disable-gpu","--no-first-run","--hide-scrollbars","--force-device-scale-factor=1",
  `--user-data-dir=${process.env.SCR}/chrome-profile`,"--virtual-time-budget=10000",`--window-size=${size}`,`--screenshot=${out}`, html], { stdio: "ignore" });
const t0 = Date.now();
const iv = setInterval(() => {
  const done = fs.existsSync(out) && fs.statSync(out).size > 0;
  if (done || Date.now() - t0 > 40000) {
    clearInterval(iv);
    setTimeout(() => { try { process.kill(p.pid, "SIGKILL"); } catch {} ; console.log(done ? `ok ${fs.statSync(out).size} bytes` : "timeout"); process.exit(0); }, 1500);
  }
}, 300);
