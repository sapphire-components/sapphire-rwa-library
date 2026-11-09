// Runs in the page through the claude-in-chrome javascript_tool.
// The agent replaces __RULES__ with the "rules" array from classes.json
// and __HIGHLIGHT__ with true or false before running it.
(() => {
  const rules = __RULES__;
  const highlight = __HIGHLIGHT__;

  const tests = rules.map((r) => {
    if (r.match === "regex") {
      const re = new RegExp(r.value);
      return (c) => re.test(c);
    }
    if (r.match === "prefix") return (c) => c.startsWith(r.value);
    return (c) => c === r.value;
  });

  const pathOf = (el) => {
    const parts = [];
    while (el && el.nodeType === 1 && parts.length < 6) {
      let p = el.tagName.toLowerCase();
      if (el.id) {
        parts.unshift(p + "#" + el.id);
        break;
      }
      const cls = [...el.classList].slice(0, 2).join(".");
      if (cls) p += "." + cls;
      parts.unshift(p);
      el = el.parentElement || el.getRootNode().host;
    }
    return parts.join(" > ");
  };

  const roots = [document];
  const skipped = [];
  const elements = [];
  while (roots.length) {
    const root = roots.shift();
    for (const el of root.querySelectorAll("*")) {
      elements.push(el);
      if (el.shadowRoot) roots.push(el.shadowRoot);
      if (el.tagName === "IFRAME") {
        try {
          if (el.contentDocument) roots.push(el.contentDocument);
        } catch {
          skipped.push(el.src ? el.src.split("?")[0] : "(iframe)");
        }
      }
    }
  }

  const results = rules.map((r) => ({ ...r, count: 0, visible: 0, classes: {}, samples: [] }));
  for (const el of elements) {
    if (!el.classList || !el.classList.length) continue;
    tests.forEach((test, i) => {
      const hits = [...el.classList].filter(test);
      if (!hits.length) return;
      const res = results[i];
      res.count++;
      hits.forEach((h) => (res.classes[h] = (res.classes[h] || 0) + 1));
      const rect = el.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 &&
        getComputedStyle(el).visibility !== "hidden";
      if (isVisible) res.visible++;
      if (res.samples.length < 5) {
        res.samples.push({
          path: pathOf(el),
          text: (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
          visible: isVisible,
        });
      }
      if (highlight && isVisible) {
        const color = { error: "#e11d48", warning: "#f59e0b", info: "#3b82f6" }[res.severity] || "#e11d48";
        el.style.outline = "2px dashed " + color;
        el.style.outlineOffset = "1px";
        el.title = "[css-audit] " + hits.join(" ") + " - " + res.reason;
      }
    });
  }

  return JSON.stringify({
    // Pathname only: the extension blocks results that contain query strings.
    url: location.origin + location.pathname,
    title: document.title,
    scannedElements: elements.length,
    skippedIframes: skipped,
    findings: results.filter((r) => r.count > 0),
    clean: results.filter((r) => r.count === 0).map((r) => r.match + ":" + r.value),
  });
})();
