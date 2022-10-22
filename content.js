"use strict";

const DEBUG_MODE = false;

// Debugger works with DEBUG_MODE == true
class Debugger {
  constructor(debugMode) {
    this.active = debugMode;
  }
  log(...input) {
    this.active && console.log(...input);
  }
}

const debug = new Debugger(DEBUG_MODE);

const LS_PREFIX = "ws__";
const LS_KEYS = {
  loadingPreview: LS_PREFIX + "loadingPreview",
  scrollX: LS_PREFIX + "scrollX",
  scrollY: LS_PREFIX + "scrollY",
};

let toastStack = [];

init();

function init() {
  const textBox1 = document.querySelector("#wpTextbox1");

  // Create a preview button
  const btn = document.createElement("button");
  btn.setAttribute("id", `${LS_PREFIX}preview-button`);
  btn.setAttribute("class", `${LS_PREFIX}init`);
  btn.setAttribute("title", "Preview in another tab [ctrl+Enter]");
  btn.innerText = "Preview";
  btn.addEventListener("click", previewButtonClickHandler);
  btn.addEventListener("mousedown", () => {
    btn.classList.remove(`${LS_PREFIX}clicked`);
  });
  buttonVisibilityHandler();

  const body = document.querySelector("body");
  body.appendChild(btn);

  function previewButtonClickHandler() {
    btn.classList.add(`${LS_PREFIX}clicked`);
    sendPreviewReq();
  }

  // Show/Hide preview button according to TextBox visibility
  document.addEventListener("scroll", buttonVisibilityHandler);
  window.addEventListener("resize", buttonVisibilityHandler);

  function buttonVisibilityHandler() {
    if (textBox1.getBoundingClientRect().top < window.innerHeight) {
      btn.classList.remove(`${LS_PREFIX}hidden`);
      btn.classList.remove(`${LS_PREFIX}init`);
    } else {
      btn.classList.add(`${LS_PREFIX}hidden`);
    }
    btn.classList.add(`${LS_PREFIX}clicked`);
  }

  // Scroll to previous position if reloaded by the preview button
  // on other tab
  if (localStorage.getItem(LS_KEYS.loadingPreview) === "true") {
    scroll();
    localStorage.setItem(LS_KEYS.loadingPreview, "false");
  }

  // Set shortcut keys
  document.querySelector("#wpTextbox1").addEventListener("keydown", (e) => {
    // Ctrl+Enter : preview
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      sendPreviewReq();
    }
  });
}

// Send a preview request to the background
function sendPreviewReq() {
  let text = document.querySelector("#wpTextbox1").value;
  let loc = window.location;

  let titleMatch = loc.href.match(
    /(?<=\/wiki\/).*?(?=\?)|(?<=[?&]title=).*?(?=(?:[?&]|$))/
  );
  let title = titleMatch[0];

  chrome.runtime.sendMessage(
    {
      command: "preview",
      input_text: text,
      origin: loc.origin.replace(/https?/, ""),
      title: title,
    },
    (res) => {
      debug.log("res:", res);
    }
  );
}

function scroll() {
  window.scrollTo(
    Number(localStorage.getItem(LS_KEYS.scrollX)),
    Number(localStorage.getItem(LS_KEYS.scrollY))
  );
}

// Receive messages from background
chrome.runtime.onMessage.addListener(async function (
  req,
  sender,
  sendResponse
) {
  switch (req.command) {
    case "preview": {
      // Run preview
      sendResponse({ status_code: 200, original_command: req.command });

      document.querySelector("#wpTextbox1").value = req.input_text;
      await localStorage.setItem(LS_KEYS.scrollX, `${window.scrollX}`);
      await localStorage.setItem(LS_KEYS.scrollY, `${window.scrollY}`);
      await localStorage.setItem(LS_KEYS.loadingPreview, "true");
      document.querySelector("#wpPreview").click();

      scroll();
      break;
    }
    case "notify": {
      // Notify messages
      sendResponse({ status_code: 200, original_command: req.command });

      let messageHTML = `<div class="${LS_PREFIX + "toast-main-message"}">${
        req.message.main
      }</div>`;

      if (req.message.sub) {
        messageHTML += `<div class="${LS_PREFIX + "toast-sub-message"}">${
          req.message.sub
        }</div>`;
      }

      let toastContainer = document.querySelector(
        `#${LS_PREFIX}toast-container`
      );

      if (toastContainer === null) {
        toastContainer = document.createElement("div");
        toastContainer.setAttribute("id", LS_PREFIX + "toast-container");
        document.querySelector("body").appendChild(toastContainer);
      }

      let toast = document.createElement("div");
      toast.className = LS_PREFIX + "toast";
      toast.innerHTML = messageHTML;

      if (toastStack.length > 2) {
        let overToast = toastStack.shift();
        overToast.classList.add(`${LS_PREFIX}fadeout`);
        setTimeout(() => {
          overToast.remove();
        }, 400);
      }

      toastStack.push(toast);
      toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 4000);
      break;
    }
    default: {
      sendResponse({
        status_code: 400,
        error_msg: `unknown command "${req.command}"`,
        original_command: req.command,
      });
    }
  }
});
