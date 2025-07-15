document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".copy-code-button").forEach(function (button) {
    button.addEventListener("click", function () {
      const codeBlock = this.closest(".highlight").querySelector("code");
      const textToCopy = codeBlock.innerText;

      navigator.clipboard
        .writeText(textToCopy)
        .then(function () {
          const originalIcon = button.innerHTML;
          button.innerHTML = '<i class="fas fa-check"></i>'; // Change icon to checkmark
          setTimeout(function () {
            button.innerHTML = originalIcon; // Revert icon after a short delay
          }, 2000);
        })
        .catch(function (err) {
          console.error("Failed to copy text: ", err);
        });
    });
  });
});
