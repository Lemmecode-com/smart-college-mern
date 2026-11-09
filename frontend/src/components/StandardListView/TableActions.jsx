import React from "react";
import ActionIconButton from "../common/ActionIconButton";

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
        const Icon =
          typeof action.getIcon === "function"
            ? action.getIcon(item)
            : action.icon;
        const label =
          typeof action.getLabel === "function"
            ? action.getLabel(item)
            : typeof action.label === "function"
              ? action.label(item)
              : action.label;

        const isDisabled =
          typeof action.disabled === "function"
            ? action.disabled(item)
            : action.disabled === true;

        const tooltip =
          typeof action.title === "function"
            ? action.title(item)
            : action.title || label || action.text;


        if (typeof action.render === "function") {
          return (
            <React.Fragment key={action.key}>
              {action.render(item)}
            </React.Fragment>
          );
        }

        return (
          <ActionIconButton
            key={action.key}
            icon={Icon}
            className={action.className}
            onClick={() => action.onClick?.(item)}
            disabled={isDisabled}
            ariaLabel={label || action.text || action.key}
            tooltip={tooltip || label || action.text || action.key}
            style={action.style}
          />
        );

      })}
    </div>
  );
};

export default TableActions;