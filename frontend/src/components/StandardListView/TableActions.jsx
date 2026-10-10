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

        const isDisabled =
          typeof action.disabled === "function"
            ? action.disabled(item)
            : action.disabled === true;

        const title =
          typeof action.title === "function"
            ? action.title(item)
            : action.title || action.label;

        return (
          <button
            key={action.key}
            type="button"
            className={`standard-action-btn ${
              action.className || ""
            }`}
            onClick={() => {
              if (!isDisabled) {
                action.onClick?.(item);
              }
            }}
            disabled={isDisabled}
            title={title}
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