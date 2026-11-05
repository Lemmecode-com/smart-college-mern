import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";
import api from "../../api/axios";
import LogoImage, { getSessionLogo, setSessionLogo } from "../../components/common/LogoImage";

describe("LogoImage Component", () => {
  let container;
  let root;
  let mock;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    mock = new MockAdapter(api);

    // Mock URL.createObjectURL
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi.fn((blob) => `blob:mock-url-${blob?.size || 0}`);
    }

    try {
      window.sessionStorage.clear();
    } catch {
      // Ignore
    }
  });

  afterEach(() => {
    mock.restore();
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  it("shows pulse skeleton while loading with a documentId", async () => {
    // Keep request pending
    mock.onGet(/\/documents\/doc-pending/).reply(() => new Promise(() => {}));

    await act(async () => {
      root.render(<LogoImage documentId="doc-pending" size={85} />);
    });

    const skeleton = container.querySelector('[data-testid="logo-skeleton"]');
    expect(skeleton).not.toBeNull();
    const img = container.querySelector("img");
    expect(img).toBeNull();
  });

  it("shows fallback error placeholder when documentId is null or missing", async () => {
    await act(async () => {
      root.render(<LogoImage documentId={null} size={85} />);
    });

    const placeholder = container.querySelector('[data-testid="logo-placeholder"]');
    expect(placeholder).not.toBeNull();
    const img = container.querySelector("img");
    expect(img).toBeNull();
  });

  it("renders image after successful load", async () => {
    const fakeBlob = new Blob(["fake-image-bytes"], { type: "image/webp" });
    mock.onGet(/\/documents\/doc-success/).reply(200, fakeBlob, {
      "content-type": "image/webp",
    });

    await act(async () => {
      root.render(<LogoImage documentId="doc-success" size={85} />);
    });

    // Wait for resolution
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img.getAttribute("src")).toContain("blob:");
    const skeleton = container.querySelector('[data-testid="logo-skeleton"]');
    expect(skeleton).toBeNull();
  });

  it("shows error placeholder on request failure", async () => {
    mock.onGet(/\/documents\/doc-error/).reply(500);

    await act(async () => {
      root.render(<LogoImage documentId="doc-error" size={85} />);
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const placeholder = container.querySelector('[data-testid="logo-placeholder"]');
    expect(placeholder).not.toBeNull();
    const img = container.querySelector("img");
    expect(img).toBeNull();
  });

  it("restores logo immediately from sessionStorage without loading state", async () => {
    const fakeDataUrl = "data:image/webp;base64,AAAA";
    setSessionLogo("doc-session-cached", fakeDataUrl);

    await act(async () => {
      root.render(<LogoImage documentId="doc-session-cached" size={85} />);
    });

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img.getAttribute("src")).toBe(fakeDataUrl);
    const skeleton = container.querySelector('[data-testid="logo-skeleton"]');
    expect(skeleton).toBeNull();
  });
});
