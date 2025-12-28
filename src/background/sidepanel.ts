function setPanelBehaviorFromMode(mode: "popup" | "sidepanel") {
  const openPanel = mode === "sidepanel";
  const sidePanel = chrome.sidePanel;

  if (sidePanel && sidePanel.setPanelBehavior) {
    sidePanel.setPanelBehavior({ openPanelOnActionClick: openPanel });
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed");

  const sidePanel = (chrome as any).sidePanel;
  if (sidePanel && sidePanel.setOptions) {
    sidePanel.setOptions({ enabled: true, path: "src/popup/index.html" });
  }

  if (details.reason === "install") {
    chrome.storage.local.set({ uiMode: "sidepanel" }, () => {
      setPanelBehaviorFromMode("sidepanel");
    });
  } else {
    chrome.storage.local.get({ uiMode: "sidepanel" }, (res) => {
      setPanelBehaviorFromMode(res.uiMode as "popup" | "sidepanel");
    });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SET_UIMODE") {
    const mode = message.value === "sidepanel" ? "sidepanel" : "popup";
    chrome.storage.local.set({ uiMode: mode }, () => {
      setPanelBehaviorFromMode(mode);
      sendResponse({ ok: true });
    });
    return true;
  }
});
