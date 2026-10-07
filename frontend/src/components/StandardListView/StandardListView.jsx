import React, { useMemo, useState } from "react";
import { FaSearch } from "react-icons/fa";

import StandardTable from "./StandardTable";
import TableEmptyState from "./TableEmptyState";
import TableSkeleton from "./TableSkeleton";

import "./StandardListView.css";

const StandardListView = ({
  title,
  icon: HeaderIcon,
  count,
  search,
  columns = [],
  data = [],
  loading = false,
  emptyState,
  actions,
  className = "",
  sortable = true,
  showHeader = true,
  showSearch = true,
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

  const handleSort = (key) => {
    const column = columns.find((col) => col.key === key);

    if (!sortable || !column?.sortable) {
      return;
    }

    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) {
      return data;
    }

    const column = columns.find(
      (col) => col.key === sortConfig.key
    );

    if (!column?.sortable) {
      return data;
    }

    const sorted = [...data];

    sorted.sort((a, b) => {
      const aValue = column.sortValue
        ? column.sortValue(a)
        : a?.[sortConfig.key];

      const bValue = column.sortValue
        ? column.sortValue(b)
        : b?.[sortConfig.key];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      const normalizedA =
        typeof aValue === "string"
          ? aValue.toLowerCase()
          : aValue;

      const normalizedB =
        typeof bValue === "string"
          ? bValue.toLowerCase()
          : bValue;

      if (normalizedA < normalizedB) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }

      if (normalizedA > normalizedB) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }

      return 0;
    });

    return sorted;
  }, [data, columns, sortConfig, sortable]);

  return (
    <div className={`standard-list-view ${className}`}>
      {/* HEADER */}
      <div className="standard-list-header">
        <div className="standard-list-header-left">
          { showHeader && HeaderIcon && (
            <div className="standard-list-header-icon">
              <HeaderIcon />
            </div>
          )}

          <div className="standard-list-title-wrapper">
            <div className="standard-list-title-row">
              <h3>{title}</h3>

              {typeof count === "number" && (
                <span className="standard-list-count">
                  {count} {count === 1 ? "Item" : "Items"}
                </span>
              )}
            </div>
          </div>
        </div>

        { showSearch && search && (
          <div className="standard-list-header-right">
            <div className="standard-list-search">
              <FaSearch className="standard-list-search-icon" />

              <input
                type="text"
                value={search.value}
                onChange={(event) =>
                  search.onChange(event.target.value)
                }
                placeholder={
                  search.placeholder || "Search..."
                }
                aria-label={search.placeholder || "Search"}
              />
            </div>
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="standard-list-body">
        {loading ? (
          <TableSkeleton columns={columns} />
        ) : sortedData.length === 0 ? (
          <TableEmptyState {...emptyState} />
        ) : (
          <StandardTable
            columns={columns}
            data={sortedData}
            sortConfig={sortConfig}
            onSort={handleSort}
            actions={actions}
          />
        )}
      </div>
    </div>
  );
};

export default StandardListView;