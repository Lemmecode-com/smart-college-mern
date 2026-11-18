import React from "react";

const TableSkeleton = ({
  columns = [],
  rows = 5,
}) => {
  return (
    <div className="standard-skeleton-table">
      {[...Array(rows)].map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="standard-skeleton-row"
        >
          {columns.map((column, columnIndex) => (
            <div
              key={column.key || columnIndex}
              className={`standard-skeleton-cell ${
                column.skeletonType || "text"
              }`}
              style={{
                width:
                  column.skeletonWidth || "60%",
              }}
            />
          ))}

          <div className="standard-skeleton-actions">
            <div className="standard-skeleton-action" />
            <div className="standard-skeleton-action" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;