import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ActionIconButton from "../../components/common/ActionIconButton";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe("ActionIconButton", () => {
  let container;
  let root;
  let buttonRect;
  let boundsSpy;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    buttonRect = { top: 100, left: 10, width: 40, height: 40, bottom: 140 };
    boundsSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function getBounds() {
        if (this.getAttribute("role") === "tooltip") {
          return { top: 0, left: 0, width: 100, height: 30 };
        }

        return buttonRect;
      });
  });

  afterEach(() => {
    if (root) {
      act(() => root.unmount());
    }
    container?.remove();
    boundsSpy.mockRestore();
    root = null;
    container = null;
  });

  const renderButton = async (props = {}) => {
    await act(async () => {
      root.render(
        <ActionIconButton
          icon={() => <svg />}
          ariaLabel="View record"
          tooltip="View record"
          onClick={props.onClick}
          disabled={props.disabled}
        />
      );
    });
    return container.querySelector("button");
  };

  it("shows a portal tooltip on hover, above when there is room", async () => {
    const button = await renderButton();

    await act(async () => {
      button.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    });

    const tooltip = document.body.querySelector('[role="tooltip"]');
    expect(tooltip?.textContent).toBe("View record");
    expect(tooltip?.className).not.toContain("--bottom");
    expect(tooltip?.style.top).toBe("92px");
    expect(tooltip?.style.left).toBe("58px");
  });

  it("shows the tooltip below the button when there is insufficient space above", async () => {
    buttonRect = { top: 10, left: 80, width: 40, height: 40, bottom: 50 };
    const button = await renderButton();

    await act(async () => {
      button.focus();
    });

    const tooltip = document.body.querySelector('[role="tooltip"]');
    expect(tooltip?.className).toContain("--bottom");
    expect(tooltip?.style.top).toBe("58px");
  });

  it("does not show a tooltip or invoke the action when disabled", async () => {
    const onClick = vi.fn();
    const button = await renderButton({ disabled: true, onClick });

    await act(async () => {
      button.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      button.click();
    });

    expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
    expect(onClick).not.toHaveBeenCalled();
  });
});
