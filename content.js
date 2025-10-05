let isEnabled = false; // Local state in the content script

function deepQuerySelectorAll(selector, root = document) {
  let results = Array.from(root.querySelectorAll(selector));
  const allElements = Array.from(root.querySelectorAll("*"));
  allElements.forEach((el) => {
    if (el.shadowRoot) {
      results = results.concat(deepQuerySelectorAll(selector, el.shadowRoot));
    }
  });
  return results;
}

function setOpacityToZero() {
  deepQuerySelectorAll("img, figure, svg, svg *, iframe, video").forEach((elm) => {
    if (!elm.hasAttribute("data-original-opacity")) {
      const originalOpacity = getComputedStyle(elm).opacity || "1";
      elm.setAttribute("data-original-opacity", originalOpacity);
    }
    elm.style.setProperty("opacity", "0", "important");
  });
}

function resetOpacity() {
  deepQuerySelectorAll("img, figure, svg, svg *, iframe").forEach((elm) => {
    if (elm.hasAttribute("data-original-opacity")) {
      const originalOpacity = elm.getAttribute("data-original-opacity");
      elm.style.setProperty("opacity", originalOpacity, "important");
      elm.removeAttribute("data-original-opacity");
    }
  });
}

function getEffectiveColor(elm) {
  const originalStyleOpacity = elm.style.opacity;
  const computedOpacity = getComputedStyle(elm).opacity;

  // Temporarily override the element's opacity to what it would normally be rendered at
  elm.style.opacity = computedOpacity;

  const effectiveColor = getComputedStyle(elm).color;

  // Restore the original inline style
  elm.style.opacity = originalStyleOpacity;

  // Fallback for transparent colors
  return effectiveColor === "rgba(0, 0, 0, 0)" ? "initial" : effectiveColor;
}



function hideText() {
  deepQuerySelectorAll("p, h1, h2, h3, h4, a, span, div, option, input, li, ol, time, i, button, cite, em, b, strong, td, th, tr, caption, figcaption, label, yt-formatted-string").forEach((elm) => {
    if (!elm.hasAttribute("data-original-text-indent")) {
      const originalTextIndent = getComputedStyle(elm).textIndent || "0px";
      elm.setAttribute("data-original-text-indent", originalTextIndent);
    }

    if (!elm.hasAttribute("data-original-color")) {
      elm.setAttribute("data-original-color", getEffectiveColor(elm) || "initial");
    }

    elm.style.setProperty("textIndent", "-99999px", "important");
    elm.style.setProperty("color", "transparent", "important"); // Hide the text by setting color to transparent
  });
}

function showText() {
  deepQuerySelectorAll("p, h1, h2, h3, h4, a, span, div, option, input, li, ol, time, i, button, cite, em, b, strong, td, th, tr, caption, figcaption, label, yt-formatted-string").forEach((elm) => {
    // Restore textIndent
    if (elm.hasAttribute("data-original-text-indent")) {
      const originalTextIndent = elm.getAttribute("data-original-text-indent");
      elm.style.setProperty("textIndent", originalTextIndent, "important");
      elm.removeAttribute("data-original-text-indent");
    }

    // Restore color, with transparency fallback
    if (elm.hasAttribute("data-original-color")) {
      const originalColor = elm.getAttribute("data-original-color");

      // If color is stored as transparent or rgba(0, 0, 0, 0), fallback to "initial"
      if (originalColor === "rgba(0, 0, 0, 0)" || originalColor === "transparent") {
        elm.style.removeProperty("color"); // Remove inline style if it's transparent
        elm.style.setProperty("color", "initial", "important"); // Set to default color
      } else {
        elm.style.setProperty("color", originalColor, "important");
      }

      elm.removeAttribute("data-original-color");
    }
  });
}


function hideBackgroundImages() {
  deepQuerySelectorAll("*").forEach((elm) => {
    const computedStyle = getComputedStyle(elm);
    const bgImage = computedStyle.backgroundImage;

    if (bgImage && bgImage !== "none" && !elm.hasAttribute("data-original-background-image")) {
      elm.setAttribute("data-original-background-image", bgImage);
      elm.style.setProperty("backgroundImage", "none", "important");
    }
  });
}

function showBackgroundImages() {
  deepQuerySelectorAll("*").forEach((elm) => {
    if (elm.hasAttribute("data-original-background-image")) {
      const originalBgImage = elm.getAttribute("data-original-background-image");
      elm.style.setProperty("backgroundImage", originalBgImage, "important");
      elm.removeAttribute("data-original-background-image");
    }
  });
}

function showBackgroundIfUrl() {
  deepQuerySelectorAll("*").forEach((elm) => {
    const background = getComputedStyle(elm).background;
    if (background && background.includes("url(") && !elm.hasAttribute("data-original-background")) {
      elm.setAttribute("data-original-background", background);
      elm.style.setProperty("background", "none", "important");
    }
  });
}

function restoreBackgroundIfUrl() {
  deepQuerySelectorAll("*").forEach((elm) => {
    if (elm.hasAttribute("data-original-background")) {
      const originalBackground = elm.getAttribute("data-original-background");
      elm.style.setProperty("background", originalBackground, "important");
      elm.removeAttribute("data-original-background");
    }
  });
}

function toggleFunctionality(state) {
  if (state) {
    hidePlaceholders();
    setOpacityToZero();
    hideText();
    hideBackgroundImages();
    showBackgroundIfUrl();
    SidelineObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    resetOpacity();
    showText();
    showBackgroundImages();
    restoreBackgroundIfUrl();
    showPlaceholders();
    SidelineObserver.disconnect();
  }
}

const SidelineObserver = new MutationObserver((mutations) => {
  if (!isEnabled) return;
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) {
        setOpacityToZero();
        hideText();
        hideBackgroundImages();
        showBackgroundIfUrl();
      }
    });
  });
});

function hidePlaceholders() {
  const style = document.createElement("style");
  style.setAttribute("data-sideline-placeholder-style", "true");
  style.textContent = `
    input::placeholder,
    textarea::placeholder {
      color: transparent !important;
    }
  `;
  document.head.appendChild(style);

  // Also hide the `placeholder` attribute visually as fallback
  deepQuerySelectorAll("input[placeholder], textarea[placeholder]").forEach(elm => {
    elm.setAttribute("data-original-placeholder", elm.getAttribute("placeholder"));
    elm.setAttribute("placeholder", " ");
  });
}

function showPlaceholders() {
  // Remove the injected style
  const existingStyle = document.querySelector('style[data-sideline-placeholder-style]');
  if (existingStyle) existingStyle.remove();

  // Restore the original placeholder text
  deepQuerySelectorAll("input, textarea").forEach(elm => {
    if (elm.hasAttribute("data-original-placeholder")) {
      elm.setAttribute("placeholder", elm.getAttribute("data-original-placeholder"));
      elm.removeAttribute("data-original-placeholder");
    }
  });
}


chrome.storage.local.get("isEnabled", ({ isEnabled: state }) => {
  isEnabled = state;
  toggleFunctionality(isEnabled);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateState") {
    isEnabled = message.isEnabled;
    toggleFunctionality(isEnabled);
    sendResponse({ status: "updated", isEnabled });
  }
});
