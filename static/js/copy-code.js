(() => {
  const initCopyCode = function () {
  const resetTimers = new WeakMap();
  const managedPreBlocks = document.querySelectorAll("article .highlight pre");

  const updateScrollablePre = function (pre) {
    const scrollable = pre.scrollWidth > pre.clientWidth + 1;
    if (scrollable) {
      if (!pre.hasAttribute("tabindex")) {
        pre.tabIndex = 0;
        pre.dataset.scrollFocusManaged = "true";
      }
      if (!pre.hasAttribute("role")) pre.setAttribute("role", "region");
      if (!pre.hasAttribute("aria-label")) {
        pre.setAttribute("aria-label", "가로로 스크롤 가능한 코드");
      }
      return;
    }

    if (pre.dataset.scrollFocusManaged === "true") {
      pre.removeAttribute("tabindex");
      pre.removeAttribute("role");
      pre.removeAttribute("aria-label");
      delete pre.dataset.scrollFocusManaged;
    }
  };

  const refreshScrollableCode = function () {
    managedPreBlocks.forEach(updateScrollablePre);
  };

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(function (entries) {
      entries.forEach(function (entry) {
        updateScrollablePre(entry.target);
      });
    });
    managedPreBlocks.forEach(function (pre) {
      observer.observe(pre);
    });
  } else {
    window.addEventListener("resize", refreshScrollableCode, { passive: true });
  }

  refreshScrollableCode();
  window.addEventListener("load", refreshScrollableCode, { once: true });

  const writeClipboard = async function (text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Clipboard copy was rejected");
  };

  document.querySelectorAll(".copy-code-button").forEach(function (button) {
    const originalIcon = button.innerHTML;
    const originalLabel = button.getAttribute("aria-label") || "코드 복사";
    button.setAttribute("aria-live", "polite");

    button.addEventListener("click", async function () {
      const codeBlock = button.closest(".highlight")?.querySelector("code");
      if (!codeBlock) return;

      try {
        await writeClipboard(codeBlock.innerText);
        window.clearTimeout(resetTimers.get(button));
        button.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i>';
        button.setAttribute("aria-label", "복사됨");

        const timer = window.setTimeout(function () {
          button.innerHTML = originalIcon;
          button.setAttribute("aria-label", originalLabel);
          resetTimers.delete(button);
        }, 2000);
        resetTimers.set(button, timer);
      } catch (error) {
        console.error("Failed to copy text:", error);
      }
    });
  });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCopyCode, { once: true });
  } else {
    initCopyCode();
  }
})();
