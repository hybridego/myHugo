(() => {
  const initReward = function () {
  const openButton = document.querySelector(".show-zs");
  const backdrop = document.querySelector(".zs-modal-bg");
  const dialog = document.querySelector(".zs-modal-box");
  if (!openButton || !backdrop || !dialog) return;

  const closeButton = dialog.querySelector(".close");
  const amountButtons = [...dialog.querySelectorAll(".zs-modal-btns .btn")];
  const amountChoices = dialog.querySelector(".zs-modal-btns");
  const payment = dialog.querySelector(".zs-modal-pay");
  const footer = dialog.querySelector(".zs-modal-footer");
  const payType = dialog.querySelector("#pay-type");
  const payImage = dialog.querySelector("#pay-image");
  const payText = dialog.querySelector("#pay-text");
  let selectedAmount = "2";
  let selectedText = "2元";
  let previousFocus = null;

  const setVisible = function (element, visible, display = "block") {
    if (!element) return;
    element.hidden = !visible;
    element.style.display = visible ? display : "none";
  };

  const currentPaymentType = function () {
    return dialog.querySelector('.zs-type:checked')?.value || "wechat";
  };

  const updatePayment = function () {
    const type = currentPaymentType();
    payType.textContent = type === "alipay" ? "支付宝" : "微信";
    payText.textContent = selectedText;
    payImage.src = `/img/reward/${type}-${selectedAmount}.png`;
    payImage.alt = `${payType.textContent} 결제 QR 코드`;
  };

  const hide = function () {
    setVisible(backdrop, false);
    setVisible(dialog, false);
    dialog.setAttribute("aria-hidden", "true");
    document.body.classList.remove("reward-dialog-open");
    previousFocus?.focus();
  };

  const show = function () {
    previousFocus = document.activeElement;
    setVisible(backdrop, true);
    setVisible(dialog, true);
    setVisible(amountChoices, true);
    setVisible(footer, true);
    setVisible(payment, false);
    dialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("reward-dialog-open");
    closeButton?.focus();
  };

  openButton.addEventListener("click", show);
  closeButton?.addEventListener("click", hide);
  backdrop.addEventListener("click", hide);

  amountButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      selectedAmount = button.dataset.num || "1";
      selectedText = button.textContent.trim();
      updatePayment();
      setVisible(payment, true);
      setVisible(amountChoices, false);
      setVisible(footer, false);
    });
  });

  dialog.querySelectorAll(".zs-type").forEach(function (radio) {
    radio.addEventListener("change", updatePayment);
  });

  dialog.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      event.preventDefault();
      hide();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = [...dialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter(function (element) { return !element.hidden && element.getClientRects().length; });
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initReward, { once: true });
  } else {
    initReward();
  }
})();
