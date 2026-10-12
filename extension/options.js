document.getElementById("save").addEventListener("click", async () => {
  const token = document.getElementById("token").value.trim();
  if (!/^[a-f0-9]{64}$/.test(token)) {
    document.getElementById("status").textContent =
      "Enter the 64-character local pairing key.";
    return;
  }
  await browser.storage.local.set({ pairingToken: token });
  document.getElementById("token").value = "";
  document.getElementById("status").textContent =
    "Saved. Codex can connect when its Zen bridge is running.";
});
