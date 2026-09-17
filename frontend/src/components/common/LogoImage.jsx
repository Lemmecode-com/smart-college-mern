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

  const url = getDocumentViewUrl(documentId);

  useEffect(() => {
    let isMounted = true;

    if (!documentId || !url) {
      setLoadError(true);
      return;
    }

    /* Already loaded */
    if (logoCache.has(documentId)) {
      setBlobUrl(logoCache.get(documentId));
      setLoadError(false);
      return;
    }

    const fetchLogo = async () => {
      try {
        setLoadError(false);

        /*
         * If another component is already fetching the same logo,
         * reuse that request instead of making another API call.
         */
        let request = logoRequestCache.get(documentId);

        if (!request) {
          request = api
            .get(url, {
              responseType: "blob",
            })
            .then((response) => {
              const newBlobUrl = URL.createObjectURL(response.data);

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
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(true);
        }
      }
    };

    fetchLogo();

    return () => {
      isMounted = false;
    };
  }, [documentId, url]);

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
          fetchPriority="high"
          style={{
            width: size - padding * 2,
            height: size - padding * 2,
            objectFit: "contain",
            display: "block",
            position: "relative",
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
}

export default LogoImage;