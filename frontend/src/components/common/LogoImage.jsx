import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FaUniversity } from "react-icons/fa";
import api from "../../api/axios";
import { getDocumentViewUrl } from "../../utils/documentUrl";

function LogoImage({ documentId, alt = "College Logo", size = 80 }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const url = getDocumentViewUrl(documentId);

  useEffect(() => {
    let isMounted = true;
    let currentBlobUrl = null;

    if (!url) {
      setLoadError(true);
      return;
    }

    const fetchLogo = async () => {
      try {
        setLoadError(false);
        const response = await api.get(url, { responseType: "blob" });
        if (!isMounted) return;
        currentBlobUrl = URL.createObjectURL(response.data);
        setBlobUrl(currentBlobUrl);
      } catch {
        if (isMounted) {
          setLoadError(true);
        }
      }
    };

    fetchLogo();

    return () => {
      isMounted = false;
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [url]);

  const iconSize = Math.round(size * 0.45);
  const padding = Math.round(size * 0.12);

  const showPlaceholder = loadError || !blobUrl;

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: "var(--border-radius-md, 0.75rem)",
    background: "#ffffff",
    border: "1px solid rgba(0, 0, 0, 0.08)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
    position: "relative",
  };

  return (
    <div style={containerStyle}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: showPlaceholder ? 1 : 0,
          transition: "opacity 0.4s ease-in-out",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <FaUniversity size={iconSize} style={{ color: "#94a3b8" }} />
      </div>

      {blobUrl && (
        <motion.img
          key={blobUrl}
          src={blobUrl}
          alt={alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            width: size - padding * 2,
            height: size - padding * 2,
            objectFit: "contain",
            display: "block",
            zIndex: 2,
          }}
        />
      )}
    </div>
  );
}

export default LogoImage;
