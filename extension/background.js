let paused = false;
const ready = browser.storage.local.get("paused").then((s) => {
  paused = s.paused === true;
});
async function badge() {
  await browser.browserAction.setBadgeText({ text: paused ? "OFF" : "ON" });
  await browser.browserAction.setBadgeBackgroundColor({
    color: paused ? "#64748b" : "#2563eb",
  });
}
ready.then(badge);
browser.browserAction.onClicked.addListener(async () => {
  await ready;
  paused = !paused;
  await browser.storage.local.set({ paused });
  await badge();
});
function allowed(tab) {
  return tab && !tab.incognito && /^https?:/.test(tab.url || "");
}
async function run(cmd) {
  await ready;
  if (paused)
    throw Error("Connector paused. Click its toolbar button to resume.");
  const a = cmd.args;
  if (cmd.name === "zen_tabs")
    return (await browser.tabs.query({}))
      .filter(allowed)
      .map((t) => ({ tabId: t.id, title: t.title, url: t.url }));
  const tab = await browser.tabs.get(a.tabId);
  if (!allowed(tab))
    throw Error(
      "Only ordinary HTTP(S) tabs are accessible; private and browser-internal tabs are excluded.",
    );
  if (cmd.name === "zen_navigate") {
    if (!/^https?:$/.test(new URL(a.url).protocol))
      throw Error("Only HTTP(S) URLs allowed");
    await browser.tabs.update(a.tabId, { url: a.url });
    return { navigating: true };
  }
  if (!["zen_read", "zen_click", "zen_fill"].includes(cmd.name))
    throw Error("Unsupported command");
  await browser.tabs.executeScript(a.tabId, { file: "content.js" });
  return await browser.tabs.sendMessage(a.tabId, { name: cmd.name, args: a });
}
async function poll() {
  try {
    const { pairingToken } = await browser.storage.local.get("pairingToken");
    if (!/^[a-f0-9]{64}$/.test(pairingToken || "")) return;
    const headers = { Authorization: "Bearer " + pairingToken };
    const r = await fetch("http://127.0.0.1:19387/poll", {
      headers,
      redirect: "error",
      credentials: "omit",
      cache: "no-store",
    });
    if (!r.ok) throw Error("Bridge unavailable");
    for (const cmd of await r.json()) {
      let output;
      try {
        output = { id: cmd.id, result: await run(cmd) };
      } catch (e) {
        output = { id: cmd.id, error: e.message };
      }
      await fetch("http://127.0.0.1:19387/result", {
        method: "POST",
        redirect: "error",
        credentials: "omit",
        cache: "no-store",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(output),
      });
    }
  } catch {
  } finally {
    setTimeout(poll, 500);
  }
}
poll();
