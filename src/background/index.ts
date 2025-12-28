import "./sidepanel";
console.log("Clorio Background Service Worker Running");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Clorio Extension Installed");
});
