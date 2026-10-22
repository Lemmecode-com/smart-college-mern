import React, { useState, useEffect } from "react";
import { FaUniversity } from "react-icons/fa";
import api from "../../api/axios";
import { getDocumentViewUrl } from "../../utils/documentUrl";

/* Cache logo URLs so the same logo is not fetched repeatedly */
const logoCache = new Map();
const logoRequestCache = new Map();

<<<<<<< HEAD
function LogoImage({ documentId, alt = "College Logo", size = 80 }) {
  const [blobUrl, setBlobUrl] = useState(
    documentId ? logoCache.get(documentId) || null : null
  );

  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!documentId);
=======
/**
 * Safely retrieve a cached logo data URL from sessionStorage
 */
export const getSessionLogo = (docId) => {
  if (!docId || typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(`college_logo_${docId}`);
  } catch {
    return null;
  }
};

/**
 * Safely persist a logo data URL to sessionStorage (small footprint)
 */
export const setSessionLogo = (docId, dataUrl) => {
  if (!docId || typeof window === "undefined" || !dataUrl) return;
  try {
    window.sessionStorage.setItem(`college_logo_${docId}`, dataUrl);
  } catch {
    // Quota exceeded or disabled, fail silently
  }
};

/**
 * Helper to fetch and cache a logo early
 */
export const preloadLogo = (documentId) => {
  if (!documentId) return;
  if (logoCache.has(documentId) || getSessionLogo(documentId)) return;

  const url = getDocumentViewUrl(documentId);
  if (!url) return;

  let request = logoRequestCache.get(documentId);
  if (!request) {
    request = api
      .get(url, { responseType: "blob" })
      .then((response) => {
        if (!response || !response.data) return null;
        const blob = response.data;
        if (!(blob instanceof Blob) || blob.size === 0) return null;

        const newBlobUrl = URL.createObjectURL(blob);
        logoCache.set(documentId, newBlobUrl);

        try {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result && typeof reader.result === "string") {
              setSessionLogo(documentId, reader.result);
            }
          };
          reader.readAsDataURL(blob);
        } catch {
          // Ignore
        }

        return newBlobUrl;
      })
      .catch(() => null)
      .finally(() => {
        logoRequestCache.delete(documentId);
      });

    logoRequestCache.set(documentId, request);
  }
};

function LogoImage({ documentId, alt = "College Logo", size = 80 }) {
  const getInitialLogo = (id) => {
    if (!id) return null;
    return logoCache.get(id) || getSessionLogo(id) || null;
  };

  const initialLogo = getInitialLogo(documentId);
  const [blobUrl, setBlobUrl] = useState(initialLogo);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(documentId && !initialLogo));
>>>>>>> origin/feature/exam-module

  useEffect(() => {
    let isMounted = true;

    /* No document ID */
    if (!documentId) {
      setBlobUrl(null);
      setLoadError(true);
      setIsLoading(false);
      return;
    }

<<<<<<< HEAD
    /* Already loaded in cache */
=======
    /* Already loaded in in-memory cache */
>>>>>>> origin/feature/exam-module
    if (logoCache.has(documentId)) {
      setBlobUrl(logoCache.get(documentId));
      setLoadError(false);
      setIsLoading(false);
      return;
    }

<<<<<<< HEAD
=======
    /* Already in sessionStorage */
    const sessionCached = getSessionLogo(documentId);
    if (sessionCached) {
      logoCache.set(documentId, sessionCached);
      setBlobUrl(sessionCached);
      setLoadError(false);
      setIsLoading(false);
      return;
    }

>>>>>>> origin/feature/exam-module
    const fetchLogo = async () => {
      try {
        setLoadError(false);
        setIsLoading(true);

        const url = getDocumentViewUrl(documentId);

        /* Make sure the document URL exists */
        if (!url) {
          throw new Error("Unable to generate logo document URL");
        }

        /*
         * Reuse an existing request if another LogoImage
         * component is already loading the same logo.
         */
        let request = logoRequestCache.get(documentId);

        if (!request) {
          request = api
            .get(url, {
              responseType: "blob",
            })
            .then((response) => {
              /*
               * Validate HTTP response
               */
              if (!response) {
                throw new Error("No response received while loading logo");
              }

              if (response.status < 200 || response.status >= 300) {
                throw new Error(
                  `Logo request failed with status ${response.status}`
                );
              }

              /*
               * Validate response data
               */
              if (!response.data) {
                throw new Error("Logo response is empty");
              }

              const blob = response.data;

              if (!(blob instanceof Blob)) {
                throw new Error("Logo response is not a valid Blob");
              }

              if (blob.size === 0) {
                throw new Error("Logo file is empty");
              }

              /*
               * Make sure we received an image.
               */
              const contentType =
                response.headers?.["content-type"] ||
                response.headers?.["Content-Type"] ||
                blob.type;

              if (contentType && !contentType.startsWith("image/")) {
                throw new Error(
                  `Invalid logo content type: ${contentType}`
                );
              }

              /*
               * Convert Blob into browser-readable URL
               */
              const newBlobUrl = URL.createObjectURL(blob);

              logoCache.set(documentId, newBlobUrl);

<<<<<<< HEAD
=======
              /* Persist to sessionStorage as data URL for instant reloads */
              try {
                const reader = new FileReader();
                reader.onloadend = () => {
                  if (reader.result && typeof reader.result === "string") {
                    setSessionLogo(documentId, reader.result);
                  }
                };
                reader.readAsDataURL(blob);
              } catch {
                // Ignore storage encoding errors
              }

>>>>>>> origin/feature/exam-module
              return newBlobUrl;
            })
            .finally(() => {
              logoRequestCache.delete(documentId);
            });

          logoRequestCache.set(documentId, request);
        }

        const newBlobUrl = await request;

        if (isMounted) {
          setBlobUrl(newBlobUrl);
          setLoadError(false);
          setIsLoading(false);
        }
      } catch (error) {
<<<<<<< HEAD
        console.error("====================================");
        console.error("Failed to load college logo");
        console.error("Document ID:", documentId);
        console.error("Logo URL:", getDocumentViewUrl(documentId));
        console.error("Status:", error?.response?.status);
        console.error(
          "Content-Type:",
          error?.response?.headers?.["content-type"]
        );
        console.error("Response:", error?.response?.data);
        console.error("Message:", error?.message);
        console.error("Full error:", error);
        console.error("====================================");

=======
>>>>>>> origin/feature/exam-module
        if (isMounted) {
          setBlobUrl(null);
          setLoadError(true);
          setIsLoading(false);
        }
      }
    };

    fetchLogo();

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  const iconSize = Math.round(size * 0.45);
  const padding = Math.round(size * 0.12);

  /*
   * Only show the placeholder when loading has finished
   * and no logo is available, or when loading failed.
   */
  const showPlaceholder = loadError || (!blobUrl && !isLoading);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "var(--border-radius-md, 0.75rem)",
        background: "transparent",
        border: "none",
        boxShadow: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flexShrink: 0,
        position: "relative",
      }}
    >
<<<<<<< HEAD
      {/* Placeholder */}
      {showPlaceholder && (
        <div
=======
      {/* Pulse Skeleton / Fallback while loading */}
      {isLoading && !blobUrl && (
        <div
          data-testid="logo-skeleton"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(90deg, rgba(226, 232, 240, 0.35) 0%, rgba(203, 213, 225, 0.6) 50%, rgba(226, 232, 240, 0.35) 100%)",
            backgroundSize: "200% 100%",
            animation: "logoSkeletonPulse 1.5s ease-in-out infinite",
            borderRadius: "inherit",
            zIndex: 1,
          }}
        >
          <FaUniversity
            size={iconSize}
            style={{
              color: "#94a3b8",
              opacity: 0.6,
            }}
          />
        </div>
      )}

      {/* Fallback / Error Placeholder */}
      {showPlaceholder && (
        <div
          data-testid="logo-placeholder"
>>>>>>> origin/feature/exam-module
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <FaUniversity
            size={iconSize}
            style={{
              color: "#94a3b8",
            }}
          />
        </div>
      )}

      {/* Logo */}
      {blobUrl && (
        <img
          src={blobUrl}
          alt={alt}
          loading="eager"
          decoding="async"
          style={{
            width: size - padding * 2,
            height: size - padding * 2,
            objectFit: "contain",
            display: "block",
            position: "relative",
            zIndex: 2,
          }}
          onError={() => {
<<<<<<< HEAD
            console.error("College logo image failed to render:", {
              documentId,
              blobUrl,
            });

=======
>>>>>>> origin/feature/exam-module
            setLoadError(true);
            setBlobUrl(null);
          }}
        />
      )}
    </div>
  );
}

export default LogoImage;