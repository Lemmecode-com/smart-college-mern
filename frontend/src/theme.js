// Global Theme Configuration for Smart College
// Use these colors consistently across all components

export const theme = {
  // Brand Colors
  primary: {
    main: "#1a4b6d",
    light: "#2d6a8a",
    dark: "#0f3a4a",
    gradient: "linear-gradient(135deg, #1a4b6d 0%, #0f3a4a 100%)"
  },
  
  // Status Colors
  success: {
    main: "#28a745",
    light: "#34ce57",
    dark: "#218838",
    gradient: "linear-gradient(135deg, #28a745 0%, #218838 100%)",
    bg: "#dcfce7",
    border: "#86efac"
  },
  
  danger: {
    main: "#dc3545",
    light: "#e4606d",
    dark: "#c82333",
    gradient: "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
    bg: "#fee2e2",
    border: "#fecaca"
  },
  
  warning: {
    main: "#ffc107",
    light: "#ffca2c",
    dark: "#e0a800",
    gradient: "linear-gradient(135deg, #ffc107 0%, #e0a800 100%)",
    bg: "#fef3c7",
    border: "#fde68a"
  },
  
  info: {
    main: "#17a2b8",
    light: "#1abcda",
    dark: "#117a8b",
    gradient: "linear-gradient(135deg, #17a2b8 0%, #117a8b 100%)",
    bg: "#e0f2fe",
    border: "#bae6fd"
  },
  
  secondary: {
    main: "#6c757d",
    light: "#7d868e",
    dark: "#545b62",
    gradient: "linear-gradient(135deg, #6c757d 0%, #545b62 100%)"
  },
  
  // Neutral Colors
  neutral: {
    white: "#ffffff",
    gray50: "#f8fafc",
    gray100: "#f1f5f9",
    gray200: "#e2e8f0",
    gray300: "#cbd5e1",
    gray400: "#94a3b8",
    gray500: "#64748b",
    gray600: "#475569",
    gray700: "#334155",
    gray800: "#1e293b",
    gray900: "#0f172a"
  },
  
  // Slot Type Colors (for Timetable)
  slotTypes: {
    LECTURE: {
      bg: "#dbeafe",
      text: "#1e40af",
      border: "#bfdbfe"
    },
    LAB: {
      bg: "#ffedd5",
      text: "#c2410c",
      border: "#fed7aa"
    },
    TUTORIAL: {
      bg: "#dcfce7",
      text: "#15803d",
      border: "#bbf7d0"
    },
    PRACTICAL: {
      bg: "#ede9fe",
      text: "#5b21b6",
      border: "#ddd6fe"
    }
  },
  
  // Shadows
  shadows: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px rgba(0, 0, 0, 0.1)",
    lg: "0 10px 15px rgba(0, 0, 0, 0.1)",
    xl: "0 20px 25px rgba(0, 0, 0, 0.15)",
    xxl: "0 25px 50px rgba(0, 0, 0, 0.2)",
    card: "0 10px 30px rgba(0, 0, 0, 0.08)",
    button: "0 4px 15px rgba(0, 0, 0, 0.1)"
  },
  
  // Border Radius
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
    full: "9999px"
  },
  
  // Spacing
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    xl: "1.25rem",
    xxl: "1.5rem",
    xxxl: "2rem"
  },
  
  // Transitions
  transitions: {
    fast: "all 0.2s ease",
    normal: "all 0.3s ease",
    slow: "all 0.5s ease"
  },
  
  // Breakpoints
  breakpoints: {
    xs: "375px",
    sm: "640px",
    md: "768px",
    lg: "1024px",
    xl: "1280px",
    xxl: "1536px"
  }
};

// Helper function to get color with opacity
export const getTransparentColor = (hex, alpha = 0.1) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Export commonly used color combinations
export const statusColors = {
  active: theme.success.main,
  inactive: theme.secondary.main,
  pending: theme.warning.main,
  completed: theme.success.main,
  cancelled: theme.danger.main,
  draft: theme.secondary.main,
  published: theme.success.main
};

export default theme;
