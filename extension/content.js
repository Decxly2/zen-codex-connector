if (!globalThis.__zenConnector) {
  globalThis.__zenConnector = { elements: [], observation: null };
  browser.runtime.onMessage.addListener((message) => {
    const state = globalThis.__zenConnector,
      a = message.args;
    if (message.name === "zen_read") {
      state.elements = [
        ...document.querySelectorAll(
          'a[href],button,input,textarea,select,[role="button"],[contenteditable="true"]',
        ),
      ].filter((e) => e.getClientRects().length && !e.disabled);
      state.observation = crypto.randomUUID();
      return Promise.resolve({
        url: location.href,
        title: document.title,
        observation: state.observation,
        text: (document.body?.innerText || "").slice(0, 80000),
        elements: state.elements.slice(0, 500).map((e, element) => ({
          element,
          tag: e.tagName,
          type: e.type || "",
          label: (
            e.getAttribute("aria-label") ||
            e.innerText ||
            e.placeholder ||
            e.name ||
            ""
          ).slice(0, 200),
        })),
      });
    }
    if (a.observation !== state.observation)
      throw Error("Stale observation; call zen_read again");
    const e = state.elements[a.element];
    if (!e || !e.isConnected || !e.getClientRects().length)
      throw Error("Element changed; read again");
    if (message.name === "zen_click") {
      e.click();
      state.observation = null;
      return Promise.resolve({ clicked: true });
    }
    if (message.name === "zen_fill") {
      if (e.type === "password" || e.type === "file" || e.type === "hidden")
        throw Error("This field type cannot be filled");
      if (e instanceof HTMLInputElement || e instanceof HTMLTextAreaElement) {
        const proto =
          e instanceof HTMLInputElement
            ? HTMLInputElement.prototype
            : HTMLTextAreaElement.prototype;
        Object.getOwnPropertyDescriptor(proto, "value").set.call(e, a.text);
      } else if (e.isContentEditable) e.textContent = a.text;
      else throw Error("Element is not a text field");
      e.dispatchEvent(new Event("input", { bubbles: true }));
      e.dispatchEvent(new Event("change", { bubbles: true }));
      state.observation = null;
      return Promise.resolve({ filled: true });
    }
    throw Error("Unsupported command");
  });
}
