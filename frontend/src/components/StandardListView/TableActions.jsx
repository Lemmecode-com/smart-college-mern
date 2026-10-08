import React from "react";

const TableActions = ({ item, actions = [] }) => {
  const visibleActions = actions.filter((action) => {
    if (typeof action.show === "function") {
      return action.show(item);
    }

    return action.show !== false;
  });

  return (
    <div className="standard-table-actions">
      {visibleActions.map((action) => {
        const Icon = action.icon;

        return (
          <button
            key={action.key}
            type="button"
            className={`standard-action-btn ${
              action.className || ""
            }`}
            onClick={() => action.onClick?.(item)}
            title={action.label}
            aria-label={action.label}
            style={action.style}
          >
            {Icon && <Icon />}
            <span>{action.text}</span>
          </button>
        );
      })}
    </div>
  );
};

export default TableActions;