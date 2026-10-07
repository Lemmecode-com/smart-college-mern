import React from "react";
import {
  FaChevronUp,
  FaChevronDown,
} from "react-icons/fa";

import TableActions from "./TableActions";

const StandardTable = ({
  columns = [],
  data = [],
  sortConfig,
  onSort,
  actions,
}) => {
  return (
    <div className="standard-table-container">
      <table className="standard-table">
        <thead>
          <tr>
            {columns.map((column) => {
              const isSortable = column.sortable === true;
              const isActiveSort =
                sortConfig?.key === column.key;

              return (
                <th
                  key={column.key}
                  style={{
                    width: column.width,
                  }}
                  className={
                    isSortable
                      ? "standard-table-sortable"
                      : ""
                  }
                  onClick={() =>
                    isSortable && onSort(column.key)
                  }
                >
                  <div className="standard-table-header-content">
                    <span>{column.label}</span>

                    {isSortable && isActiveSort && (
                      <span className="standard-table-sort-icon">
                        {sortConfig.direction === "asc" ? (
                          <FaChevronUp />
                        ) : (
                          <FaChevronDown />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}

            {actions && (
              <th
                style={{
                  width: actions.width || "14%",
                }}
                className="standard-table-actions-header"
              >
                {actions.label || "Actions"}
              </th>
            )}
          </tr>
        </thead>

        <tbody>
          {data.map((item, rowIndex) => (
            <tr
              key={
                item._id ||
                item.id ||
                item.key ||
                rowIndex
              }
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  data-label={column.label}
                >
                  {column.render
                    ? column.render(item, rowIndex)
                    : item[column.key] ?? "-"}
                </td>
              ))}

              {actions && (
                <td
                  className="standard-table-actions-cell"
                  data-label={actions.label || "Actions"}
                >
                  <TableActions
                    item={item}
                    actions={actions.items || []}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StandardTable;