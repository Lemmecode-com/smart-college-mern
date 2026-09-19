import React, { useState, useEffect } from "react";
import { FaUniversity } from "react-icons/fa";
import api from "../../api/axios";
import { getDocumentViewUrl } from "../../utils/documentUrl";

/* Cache logo URLs so the same logo is not fetched repeatedly */
const logoCache = new Map();
const logoRequestCache = new Map();

function LogoImage({ documentId, alt = "College Logo", size = 80 }) {
  const [blobUrl, setBlobUrl] = useState(
    documentId ? logoCache.get(documentId) || null : null
  );

  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    /* No document ID */
    if (!documentId) {
      setBlobUrl(null);
      setLoadError(true);
      return;
    }

    /* Already loaded in cache */
    if (logoCache.has(documentId)) {
      setBlobUrl(logoCache.get(documentId));
      setLoadError(false);
      return;
    }

    const fetchLogo = async () => {
      try {
        setLoadError(false);

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

              if (
                contentType &&
                !contentType.startsWith("image/")
              ) {
                throw new Error(
                  `Invalid logo content type: ${contentType}`
                );
              }

              /*
               * Convert Blob into browser-readable URL
               */
              const newBlobUrl = URL.createObjectURL(blob);

              logoCache.set(documentId, newBlobUrl);

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
        }
      } catch (error) {
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

        if (isMounted) {
          setBlobUrl(null);
          setLoadError(true);
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

  const showPlaceholder = loadError || !blobUrl;

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
      {/* Placeholder */}
      {showPlaceholder && (
        <div
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
            console.error("College logo image failed to render:", {
              documentId,
              blobUrl,
            });

            setLoadError(true);
            setBlobUrl(null);
          }}
        />
      )}
    </div>
  );
}

export default LogoImage;