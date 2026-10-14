import React, { useState, useMemo, useEffect } from "react";
import "./DataTable6.css";

/**
 * DataTable6: Master-Detail Table with a Synchronized Side Detail Panel (React Bits Pro Block)
 *
 * @param {Array} data - Array of data objects
 * @param {Array} columns - Column definition [{ key, label, render, sortable, width }]
 * @param {String} idKey - Unique key field for each item (default: 'id')
 * @param {String} title - Table title
 * @param {String} subtitle - Table subtitle description
 * @param {String} searchPlaceholder - Placeholder for search input
 * @param {Array} filterOptions - Category/Status filters [{ key, label, icon, filterFn }]
 * @param {Function} renderDetail - Custom renderer for the side detail panel (item, onClose, onAction)
 * @param {Function} onRowAction - Callback when quick action button is clicked
 * @param {ReactNode} extraHeaderActions - Buttons or controls to render in master header (e.g. "+ Nuevo")
 * @param {Object} selectedItem - Optionally controlled selected item
 * @param {Function} onSelectItem - Optionally controlled select handler
 */
export default function DataTable6({
  data = [],
  columns = [],
  idKey = "id",
  title = "Gestión de Datos",
  subtitle = "Selecciona un registro para ver y editar sus detalles en tiempo real",
  searchPlaceholder = "Buscar en la tabla...",
  filterOptions = [],
  renderDetail,
  onRowAction,
  extraHeaderActions,
  selectedItem: controlledSelectedItem,
  onSelectItem: controlledOnSelectItem,
  emptyMessage = "No se encontraron registros",
  badgeText = null
}) {
  const [internalSelectedItem, setInternalSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState(filterOptions[0]?.key || "all");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [panelOpen, setPanelOpen] = useState(true);

  const selectedItem = controlledSelectedItem !== undefined ? controlledSelectedItem : internalSelectedItem;

  const handleSelectItem = (item) => {
    if (controlledOnSelectItem) {
      controlledOnSelectItem(item);
    } else {
      setInternalSelectedItem(item);
    }
    setPanelOpen(true);
  };

  const handleClosePanel = () => {
    if (controlledOnSelectItem) {
      controlledOnSelectItem(null);
    } else {
      setInternalSelectedItem(null);
    }
  };

  // ── Filtrado y Búsqueda ──
  const filteredData = useMemo(() => {
    let result = [...data];

    // Aplicar filtro de categoría/estado
    if (activeFilter !== "all") {
      const option = filterOptions.find((f) => f.key === activeFilter);
      if (option && option.filterFn) {
        result = result.filter(option.filterFn);
      }
    }

    // Aplicar búsqueda global de texto
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter((item) => {
        return Object.values(item).some((val) => {
          if (val == null) return false;
          if (typeof val === "string" || typeof val === "number") {
            return String(val).toLowerCase().includes(q);
          }
          return false;
        });
      });
    }

    // Ordenamiento
    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (valA == null) return 1;
        if (valB == null) return -1;
        if (typeof valA === "number" && typeof valB === "number") {
          return sortConfig.direction === "asc" ? valA - valB : valB - valA;
        }
        return sortConfig.direction === "asc"
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [data, activeFilter, searchTerm, sortConfig, filterOptions]);

  // Si el item seleccionado ya no existe en filteredData, no auto-cerrar a menos que la data esté vacía
  useEffect(() => {
    if (data.length > 0 && !selectedItem && data[0]) {
      // Auto seleccionar el primer elemento para master-detail inmediato si no hay selección
      handleSelectItem(data[0]);
    }
  }, [data.length]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  return (
    <div className={`dt6-wrapper ${selectedItem && panelOpen ? "has-detail" : "no-detail"}`}>
      {/* ════════════════════════════════════════════════════════════
          PANEL PRINCIPAL: MASTER TABLE
      ════════════════════════════════════════════════════════════ */}
      <div className="dt6-master-pane">
        {/* Cabecera Master */}
        <div className="dt6-master-header">
          <div>
            <div className="dt6-title-row">
              <h2 className="dt6-title">{title}</h2>
              {badgeText && <span className="dt6-badge-pill">{badgeText}</span>}
              <span className="dt6-count-badge">{filteredData.length} registros</span>
            </div>
            {subtitle && <p className="dt6-subtitle">{subtitle}</p>}
          </div>

          <div className="dt6-header-actions">
            {extraHeaderActions}
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="dt6-controls-bar">
          <div className="dt6-search-wrap">
            <span className="material-icons dt6-search-icon">search</span>
            <input
              type="text"
              className="dt6-search-input"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="dt6-search-clear"
                onClick={() => setSearchTerm("")}
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          {filterOptions && filterOptions.length > 0 && (
            <div className="dt6-filters-list">
              {filterOptions.map((opt) => (
                <button
                  key={opt.key}
                  className={`dt6-filter-btn ${activeFilter === opt.key ? "active" : ""}`}
                  onClick={() => setActiveFilter(opt.key)}
                >
                  {opt.icon && <span className="dt6-filter-icon">{opt.icon}</span>}
                  <span>{opt.label}</span>
                  {opt.count != null && <span className="dt6-filter-count">{opt.count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabla Master */}
        <div className="dt6-table-container">
          <table className="dt6-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{ width: col.width || "auto", textAlign: col.align || "left" }}
                    className={col.sortable ? "sortable" : ""}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className="dt6-th-content" style={{ justifyContent: col.align === "center" ? "center" : col.align === "right" ? "flex-end" : "flex-start" }}>
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span className="dt6-sort-arrow">
                          {sortConfig.key === col.key
                            ? sortConfig.direction === "asc"
                              ? " ▲"
                              : " ▼"
                            : " ⇅"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="dt6-empty-td">
                    <div className="dt6-empty-box">
                      <span className="dt6-empty-emoji">📂</span>
                      <p>{emptyMessage}</p>
                      {searchTerm && (
                        <button className="dt6-btn-reset-search" onClick={() => setSearchTerm("")}>
                          Restablecer búsqueda
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const itemId = item[idKey];
                  const isSelected = selectedItem && selectedItem[idKey] === itemId;
                  return (
                    <tr
                      key={itemId}
                      className={`dt6-row ${isSelected ? "selected" : ""}`}
                      onClick={() => handleSelectItem(item)}
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          style={{ textAlign: col.align || "left" }}
                          className={col.className || ""}
                        >
                          {col.render ? col.render(item, isSelected) : item[col.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pie de tabla con resumen */}
        <div className="dt6-master-footer">
          <span className="dt6-footer-info">
            Mostrando {filteredData.length} de {data.length} elementos
          </span>
          {selectedItem && (
            <span className="dt6-footer-sync">
              <span className="dt6-sync-dot" />
              Sincronizado con panel de detalle
            </span>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          PANEL LATERAL: SYNCHRONIZED SIDE DETAIL PANEL
      ════════════════════════════════════════════════════════════ */}
      <aside className={`dt6-detail-pane ${selectedItem && panelOpen ? "open" : "closed"}`}>
        {selectedItem ? (
          <div className="dt6-detail-inner">
            {/* Header del panel lateral */}
            <div className="dt6-detail-header">
              <div className="dt6-detail-header-title">
                <span className="dt6-detail-pill">DETALLE SINCRONIZADO</span>
                <h3 className="dt6-detail-title">
                  {selectedItem.nombre || selectedItem.title || selectedItem.codigo || selectedItem.email || `Item #${selectedItem[idKey]}`}
                </h3>
              </div>
              <button
                className="dt6-detail-close-btn"
                onClick={handleClosePanel}
                title="Cerrar panel de detalle"
              >
                ✕
              </button>
            </div>

            {/* Contenido dinámico del panel lateral */}
            <div className="dt6-detail-body">
              {renderDetail ? (
                renderDetail(selectedItem, handleClosePanel, onRowAction)
              ) : (
                <div className="dt6-default-detail">
                  <div className="dt6-card-hero">
                    <div className="dt6-card-hero-icon">⚡</div>
                    <div>
                      <div className="dt6-card-hero-id">ID: {selectedItem[idKey]}</div>
                      <div className="dt6-card-hero-status">
                        {selectedItem.activo !== false ? "🟢 Activo" : "🔴 Inactivo"}
                      </div>
                    </div>
                  </div>

                  <div className="dt6-properties-grid">
                    {Object.entries(selectedItem).map(([k, v]) => {
                      if (typeof v === "object" && v !== null && !v.seconds && !v.toDate) return null;
                      let displayVal = String(v);
                      if (v && v.toDate) displayVal = v.toDate().toLocaleString("es-CL");
                      return (
                        <div key={k} className="dt6-property-row">
                          <span className="dt6-property-key">{k}:</span>
                          <span className="dt6-property-val">{displayVal}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="dt6-detail-placeholder">
            <div className="dt6-placeholder-icon">📋</div>
            <h4>Selecciona una fila</h4>
            <p>Haz clic en cualquier fila de la tabla para ver sus detalles, editar parámetros y ejecutar acciones operativas en tiempo real.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
