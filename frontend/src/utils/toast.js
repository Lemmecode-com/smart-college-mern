import { toast } from "react-toastify";

/**
 * Custom toast utility that ensures only one toast is visible at a time
 * by dismissing all existing toasts before showing a new one.
 */

// Toast IDs for different categories (optional grouping)
const TOAST_IDS = {
  GLOBAL: 'global-toast',
};

/**
 * Show a success toast (dismisses all other toasts first)
 * @param {string} message - Toast message
 * @param {object} options - Additional toast options
 */
export const showSuccess = (message, options = {}) => {
  toast.dismiss();
  toast.success(message, {
    toastId: TOAST_IDS.GLOBAL,
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...options,
  });
};

/**
 * Show an error toast (dismisses all other toasts first)
 * @param {string} message - Toast message
 * @param {object} options - Additional toast options
 */
export const showError = (message, options = {}) => {
  toast.dismiss();
  toast.error(message, {
    toastId: TOAST_IDS.GLOBAL,
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...options,
  });
};

/**
 * Show an info toast (dismisses all other toasts first)
 * @param {string} message - Toast message
 * @param {object} options - Additional toast options
 */
export const showInfo = (message, options = {}) => {
  toast.dismiss();
  toast.info(message, {
    toastId: TOAST_IDS.GLOBAL,
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...options,
  });
};

/**
 * Show a warning toast (dismisses all other toasts first)
 * @param {string} message - Toast message
 * @param {object} options - Additional toast options
 */
export const showWarning = (message, options = {}) => {
  toast.dismiss();
  toast.warning(message, {
    toastId: TOAST_IDS.GLOBAL,
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    ...options,
  });
};

/**
 * Dismiss all toasts
 */
export const dismissAll = () => {
  toast.dismiss();
};

/**
 * Default toast export (for backward compatibility)
 */
export const notify = {
  success: showSuccess,
  error: showError,
  info: showInfo,
  warning: showWarning,
  dismiss: dismissAll,
};

export default notify;
