"use strict";

// Receive messages from content script
chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
  if (req.command === "preview") {
    console.log(req);
    sendResponse({ status_code: 200 });
    chrome.tabs.query(
      {
        url: [
          `*${req.origin}/w/index.php*title=${req.title}*action=edit*`,
          `*${req.origin}/w/index.php*action=edit*title=${req.title}*`,
          `*${req.origin}/w/index.php*title=${req.title}*action=submit*`,
          `*${req.origin}/w/index.php*action=submit*title=${req.title}*`,
          `*${req.origin}/wiki/${req.title}*action=submit*`,
          `*${req.origin}/wiki/${req.title}*action=edit*`,
        ],
      },
      (tabs) => {
        let tabId = -1;
        for (let tab of tabs) {
          if (tab.id !== sender.tab.id) {
            tabId = tab.id;
            break;
          }
        }

        // Send an error message to content script if another tab for the same wikipedia page is not found
        if (tabId === -1) {
          let url = `/w/index.php?title=${req.title}&action=edit`;
          chrome.tabs.sendMessage(
            sender.tab.id,
            {
              command: "notify",
              type: "error",
              message: {
                main: "Not found tab for the same Wikipedia page.",
                sub: `Open <a href="${url}" target="_blank">${decodeURIComponent(
                  url
                )}</a> in new tab then try again.`,
              },
            },
            (res) => {
              console.log("res:", res);
            }
          );
          return;
        }

        // Send preview command to content script
        chrome.tabs.sendMessage(
          tabId,
          { command: "preview", input_text: req.input_text },
          (res) => {
            console.log("res:", res);
          }
        );
      }
    );
  } else
    sendResponse({
      status_code: 400,
      error_message: `unknown command "${req.command}"`,
    });
});
