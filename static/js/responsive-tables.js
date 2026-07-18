(() => {
  const initResponsiveTables = () => {
    const tables = document.querySelectorAll("article .post-container table");

    tables.forEach((table) => {
      if (table.parentElement?.classList.contains("table-scroll")) return;

      const wrapper = document.createElement("div");
      wrapper.className = "table-scroll";
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);

      const syncAccessibility = () => {
        const isScrollable = wrapper.scrollWidth > wrapper.clientWidth + 1;

        if (isScrollable) {
          wrapper.tabIndex = 0;
          wrapper.setAttribute("role", "region");
          wrapper.setAttribute("aria-label", "가로로 스크롤할 수 있는 데이터 표");
        } else {
          wrapper.removeAttribute("tabindex");
          wrapper.removeAttribute("role");
          wrapper.removeAttribute("aria-label");
        }
      };

      requestAnimationFrame(syncAccessibility);

      if ("ResizeObserver" in window) {
        new ResizeObserver(syncAccessibility).observe(wrapper);
      } else {
        window.addEventListener("resize", syncAccessibility, { passive: true });
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initResponsiveTables, { once: true });
  } else {
    initResponsiveTables();
  }
})();
