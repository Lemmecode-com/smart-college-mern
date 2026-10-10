import React from "react";

const TableEmptyState = ({
  icon: EmptyIcon,
  title = "No Data Found",
  description = "There are no records to display.",
  action,
}) => {
  return (
    <div className="standard-empty-state">
      {EmptyIcon && (
        <div className="standard-empty-icon">
          <EmptyIcon />
        </div>
      )}

      <h3>{title}</h3>

      <p className="standard-empty-description">
        {description}
      </p>

      {action && (
        <button
          type="button"
          className={`standard-empty-action ${
            action.className || ""
          }`}
          onClick={action.onClick}
        >
          {action.icon && <action.icon />}
          <span>{action.label}</span>
        </button>
      )}
    </div>
  );
};

export default TableEmptyState;