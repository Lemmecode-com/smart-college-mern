export function formatDate(value) {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value) {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
}

export function formatINR(amount) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "₹ --";
  const num = Number(amount);
  const isNegative = num < 0;
  const abs = Math.abs(num);
  let formatted = abs.toFixed(0);
  const lastThree = formatted.slice(-3);
  const remaining = formatted.slice(0, -3);
  let grouped = lastThree;
  if (remaining) {
    const parts = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    grouped = `${parts},${grouped}`;
  }
  if (isNegative) grouped = `-${grouped}`;
  return `₹ ${grouped}`;
}

export function formatNumberIN(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  const num = Number(value);
  const isNegative = num < 0;
  const abs = Math.abs(num);
  let formatted = abs.toFixed(0);
  const lastThree = formatted.slice(-3);
  const remaining = formatted.slice(0, -3);
  let grouped = lastThree;
  if (remaining) {
    const parts = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    grouped = `${parts},${grouped}`;
  }
  if (isNegative) grouped = `-${grouped}`;
  return grouped;
}
