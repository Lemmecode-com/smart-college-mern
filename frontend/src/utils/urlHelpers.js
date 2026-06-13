export const getFrontendRegistrationUrl = (url) => {
  if (!url) return "";
  const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;
  return url
    .replace(/https?:\/\/localhost:\d+/, frontendUrl)
    .replace(/https?:\/\/127\.0\.0\.1:\d+/, frontendUrl)
    .replace(/https?:\/\/[a-zA-Z0-9.-]+:\d+/, frontendUrl);
};
