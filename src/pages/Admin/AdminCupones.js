import React, { useEffect, useState, useMemo } from 'react';
import DataTable6 from '../../components/DataTable6/DataTable6';
import { db } from '../../firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import './AdminCupones.css';

export const CATEGORIAS_CUPON = [
  { key: 'todas', label: '🌐 Todas las Categorías (General)', short: 'General', color: '#a259ff', icon: '🌐' },
  { key: 'steam', label: '🎮 Steam PC & Launcher', short: 'Steam PC', color: '#00f5d4', icon: '🎮' },
  { key: 'nintendo', label: '🕹️ Nintendo Switch (1 & 2)', short: 'Switch', color: '#f43f5e', icon: '🕹️' },
  { key: 'playstation', label: '⚡ PlayStation (PS4 / PS5)', short: 'PlayStation', color: '#38bdf8', icon: '⚡' },
  { key: 'packs', label: '📦 Packs de Juegos', short: 'Packs', color: '#f59e0b', icon: '📦' },
  { key: 'sagas', label: '📚 Sagas Completas', short: 'Sagas', color: '#ec4899', icon: '📚' },
  { key: 'streaming', label: '📺 Streaming & Suscripciones', short: 'Streaming', color: '#10b981', icon: '📺' }
];

const initialForm = {
  codigo: '',
  descuento: '',
  categoria: 'todas',
  expiracion: '',
  usoMaximo: '',
  activo: true
};

export default function AdminCupones() {
  const [cupones, setCupones] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editMode, setEditMode] = useState(false); // true if editing, false if creating/viewing
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedCupon, setSelectedCupon] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const cuponesRef = collection(db, 'cupones');

  const fetchCupones = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(cuponesRef);
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCupones(list);
      if (list.length > 0 && !selectedCupon) {
        setSelectedCupon(list[0]);
        populateForm(list[0]);
      }
    } catch (e) {
      setError('Error al cargar cupones');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCupones();
  }, []);

  const populateForm = (cup) => {
    if (!cup) return;
    let expDate = '';
    if (cup.expiracion) {
      if (cup.expiracion.toDate) {
        expDate = cup.expiracion.toDate().toISOString().slice(0, 10);
      } else if (typeof cup.expiracion === 'string') {
        expDate = cup.expiracion.slice(0, 10);
      }
    }
    setForm({
      codigo: cup.codigo || '',
      descuento: cup.descuento || '',
      categoria: cup.categoria || 'todas',
      expiracion: expDate,
      usoMaximo: cup.usoMaximo || '',
      activo: cup.activo !== false
    });
  };

  const handleSelect = (cup) => {
    setIsCreatingNew(false);
    setEditMode(false);
    setSelectedCupon(cup);
    populateForm(cup);
    setError('');
    setSuccess('');
  };

  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setEditMode(true);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 30);
    const initialNew = {
      codigo: 'PANDA',
      descuento: 15,
      categoria: 'todas',
      expiracion: tomorrow.toISOString().slice(0, 10),
      usoMaximo: 50,
      activo: true
    };
    setForm(initialNew);
    setError('');
    setSuccess('');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.codigo || !form.descuento || !form.expiracion) {
      setError('Completa todos los campos obligatorios (*)');
      return;
    }

    try {
      const data = {
        codigo: form.codigo.toUpperCase().trim(),
        descuento: Number(form.descuento),
        categoria: form.categoria || 'todas',
        expiracion: Timestamp.fromDate(new Date(form.expiracion)),
        usoMaximo: form.usoMaximo ? Number(form.usoMaximo) : null,
        activo: form.activo,
        usadoPor: isCreatingNew ? [] : (selectedCupon?.usadoPor || []),
        usadoPorEmails: isCreatingNew ? [] : (selectedCupon?.usadoPorEmails || [])
      };

      if (!isCreatingNew && selectedCupon) {
        await updateDoc(doc(db, 'cupones', selectedCupon.id), data);
        setSuccess('¡Cupón actualizado con éxito!');
        setEditMode(false);
      } else {
        const docRef = await addDoc(cuponesRef, data);
        setSuccess('¡Cupón creado con éxito!');
        setIsCreatingNew(false);
        setEditMode(false);
        setSelectedCupon({ id: docRef.id, ...data });
      }

      fetchCupones();
    } catch (err) {
      setError('Error al guardar el cupón');
    }
  };

  const handleToggleStatus = async (cup) => {
    try {
      const newStatus = !cup.activo;
      await updateDoc(doc(db, 'cupones', cup.id), { activo: newStatus });
      setSuccess(`Cupón ${newStatus ? 'activado' : 'desactivado'}`);
      fetchCupones();
      if (selectedCupon?.id === cup.id) {
        setSelectedCupon((prev) => ({ ...prev, activo: newStatus }));
        setForm((prev) => ({ ...prev, activo: newStatus }));
      }
    } catch (e) {
      setError('Error al cambiar estado');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este cupón de forma permanente?')) return;
    try {
      await deleteDoc(doc(db, 'cupones', id));
      setSuccess('Cupón eliminado correctamente');
      setSelectedCupon(null);
      fetchCupones();
    } catch (e) {
      setError('Error al eliminar cupón');
    }
  };

  const handleCopyCode = (codigo) => {
    navigator.clipboard.writeText(codigo);
    setCopiedId(codigo);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // ── Columnas para DataTable 6 ──
  const columns = useMemo(() => [
    {
      key: 'codigo',
      label: 'Código de Cupón',
      sortable: true,
      render: (item) => (
        <div className="cup-code-cell">
          <span className="cup-icon">🎟️</span>
          <strong className="cup-code-text">{item.codigo}</strong>
        </div>
      )
    },
    {
      key: 'descuento',
      label: 'Descuento',
      sortable: true,
      align: 'center',
      render: (item) => (
        <span className="cup-discount-pill">
          {item.descuento}% OFF
        </span>
      )
    },
    {
      key: 'categoria',
      label: 'Aplica a',
      sortable: true,
      align: 'center',
      render: (item) => {
        const catInfo = CATEGORIAS_CUPON.find(c => c.key === (item.categoria || 'todas')) || CATEGORIAS_CUPON[0];
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 9px',
              borderRadius: 8,
              background: `${catInfo.color}18`,
              color: catInfo.color,
              border: `1px solid ${catInfo.color}40`,
              letterSpacing: '0.02em'
            }}
          >
            <span>{catInfo.icon}</span>
            <span>{catInfo.short}</span>
          </span>
        );
      }
    },
    {
      key: 'activo',
      label: 'Estado',
      sortable: true,
      align: 'center',
      render: (item) => {
        const isExpired = item.expiracion?.toDate ? item.expiracion.toDate() < new Date() : false;
        if (isExpired) {
          return <span className="dt6-chip dt6-chip-warning">⏳ Expirado</span>;
        }
        return item.activo !== false ? (
          <span className="dt6-chip dt6-chip-active">🟢 Activo</span>
        ) : (
          <span className="dt6-chip dt6-chip-inactive">🔴 Inactivo</span>
        );
      }
    },
    {
      key: 'expiracion',
      label: 'Vencimiento',
      sortable: true,
      render: (item) => {
        if (!item.expiracion) return '-';
        const d = item.expiracion.toDate ? item.expiracion.toDate() : new Date(item.expiracion);
        return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    },
    {
      key: 'usoMaximo',
      label: 'Usos',
      align: 'center',
      render: (item) => {
        const used = Math.max(item.usadoPor?.length || 0, item.usadoPorEmails?.length || 0);
        const max = item.usoMaximo || '∞';
        return (
          <span className="cup-usage-text">
            {used} / {max}
          </span>
        );
      }
    }
  ], []);

  // ── Filtros por Estado ──
  const filterOptions = useMemo(() => [
    { key: 'all', label: 'Todos', icon: '🌐', count: cupones.length, filterFn: () => true },
    {
      key: 'active',
      label: 'Activos',
      icon: '🟢',
      count: cupones.filter((c) => c.activo !== false && (c.expiracion?.toDate ? c.expiracion.toDate() >= new Date() : true)).length,
      filterFn: (c) => c.activo !== false && (c.expiracion?.toDate ? c.expiracion.toDate() >= new Date() : true)
    },
    {
      key: 'inactive',
      label: 'Inactivos',
      icon: '🔴',
      count: cupones.filter((c) => c.activo === false).length,
      filterFn: (c) => c.activo === false
    },
    {
      key: 'expired',
      label: 'Expirados',
      icon: '⏳',
      count: cupones.filter((c) => c.expiracion?.toDate && c.expiracion.toDate() < new Date()).length,
      filterFn: (c) => c.expiracion?.toDate && c.expiracion.toDate() < new Date()
    }
  ], [cupones]);

  // ── Renderer del Panel Lateral Sincronizado (Data Table 6 Detail) ──
  const renderDetailPanel = (item, onClose) => {
    const isExpired = item?.expiracion?.toDate ? item.expiracion.toDate() < new Date() : false;
    const usesCount = Math.max(item?.usadoPor?.length || 0, item?.usadoPorEmails?.length || 0);

    return (
      <div className="cup-detail-wrap">
        {/* Banner Hero del Cupón */}
        <div className="cup-hero-banner">
          <div className="cup-hero-left">
            <span className="cup-hero-tag">CUPÓN PROMOCIONAL</span>
            <div className="cup-hero-code">{isCreatingNew ? (form.codigo || 'NUEVO-CUPÓN') : item.codigo}</div>
            <div className="cup-hero-sub">Válido para compras en toda la tienda PandaStore</div>
          </div>
          <div className="cup-hero-disc">
            <span>{isCreatingNew ? (form.descuento || 0) : item.descuento}%</span>
            <small>DESCUENTO</small>
          </div>
        </div>

        {/* Notificaciones */}
        {error && <div className="cup-alert cup-alert-error">⚠️ {error}</div>}
        {success && <div className="cup-alert cup-alert-success">✅ {success}</div>}

        {/* Acciones Rápidas (si no estamos en modo nuevo) */}
        {!isCreatingNew && (
          <div className="cup-quick-strip">
            <button
              className="dt6-btn-secondary"
              onClick={() => handleCopyCode(item.codigo)}
              title="Copiar código al portapapeles"
            >
              <span className="material-icons" style={{ fontSize: 16 }}>content_copy</span>
              {copiedId === item.codigo ? '¡Copiado!' : 'Copiar'}
            </button>
            <button
              className="dt6-btn-secondary"
              onClick={() => handleToggleStatus(item)}
              title="Cambiar estado"
            >
              <span className="material-icons" style={{ fontSize: 16 }}>
                {item.activo ? 'pause_circle' : 'play_circle'}
              </span>
              {item.activo ? 'Desactivar' : 'Activar'}
            </button>
            <button
              className={`dt6-btn-secondary ${editMode ? 'active' : ''}`}
              onClick={() => setEditMode(!editMode)}
            >
              <span className="material-icons" style={{ fontSize: 16 }}>edit</span>
              {editMode ? 'Ver Ficha' : 'Modificar'}
            </button>
            <button
              className="dt6-btn-danger"
              onClick={() => handleDelete(item.id)}
              title="Eliminar cupón"
            >
              <span className="material-icons" style={{ fontSize: 16 }}>delete</span>
            </button>
          </div>
        )}

        {/* Vista Detallada o Formulario de Edición */}
        {editMode || isCreatingNew ? (
          <form className="cup-edit-form" onSubmit={handleSubmit}>
            <div className="dt6-detail-section-title">
              <span className="material-icons" style={{ fontSize: 15 }}>edit_note</span>
              {isCreatingNew ? 'Crear Nuevo Cupón' : 'Editar Propiedades del Cupón'}
            </div>

            <div className="cup-form-field">
              <label>Código del Cupón *</label>
              <input
                name="codigo"
                placeholder="Ej: STEAM2026"
                value={form.codigo}
                onChange={handleChange}
                required
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="cup-form-row">
              <div className="cup-form-field">
                <label>Descuento (%) *</label>
                <input
                  name="descuento"
                  type="number"
                  min="1"
                  max="100"
                  placeholder="15"
                  value={form.descuento}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="cup-form-field">
                <label>Usos Máximos</label>
                <input
                  name="usoMaximo"
                  type="number"
                  placeholder="Vacío = Ilimitado"
                  value={form.usoMaximo}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="cup-form-field">
              <label>Categoría Permitida *</label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                style={{
                  background: '#150d2a',
                  border: '1px solid rgba(162, 89, 255, 0.4)',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '10px 14px',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {CATEGORIAS_CUPON.map(cat => (
                  <option key={cat.key} value={cat.key} style={{ background: '#100a20', color: '#fff' }}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <small style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 4 }}>
                {form.categoria === 'todas'
                  ? 'Aplica a cualquier producto de la tienda.'
                  : `En carritos mixtos solo descontará el ${form.descuento || 0}% de los productos pertenecientes a esta categoría.`}
              </small>
            </div>

            <div className="cup-form-field">
              <label>Fecha de Expiración *</label>
              <input
                name="expiracion"
                type="date"
                value={form.expiracion}
                onChange={handleChange}
                required
              />
            </div>

            <label className="cup-checkbox-label">
              <input
                name="activo"
                type="checkbox"
                checked={form.activo}
                onChange={handleChange}
              />
              <span>Habilitar cupón inmediatamente en la tienda</span>
            </label>

            <div className="dt6-actions-row">
              <button type="submit" className="dt6-btn-primary" disabled={loading}>
                <span className="material-icons" style={{ fontSize: 16 }}>save</span>
                {isCreatingNew ? 'Crear Cupón' : 'Guardar Cambios'}
              </button>
              <button
                type="button"
                className="dt6-btn-secondary"
                onClick={() => {
                  setIsCreatingNew(false);
                  setEditMode(false);
                  if (item) populateForm(item);
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="cup-overview">
            <div className="dt6-detail-section">
              <div className="dt6-detail-section-title">
                <span className="material-icons" style={{ fontSize: 15 }}>info</span>
                Parámetros Operativos
              </div>
              <div className="dt6-properties-grid">
                <div className="dt6-property-row">
                  <span className="dt6-property-key">Estado:</span>
                  <span className="dt6-property-val">
                    {isExpired ? '⏳ Expirado' : item.activo ? '🟢 Activo para compras' : '🔴 Deshabilitado'}
                  </span>
                </div>
                <div className="dt6-property-row">
                  <span className="dt6-property-key">Aplica a:</span>
                  <span className="dt6-property-val">
                    {(() => {
                      const cat = CATEGORIAS_CUPON.find(c => c.key === (item.categoria || 'todas')) || CATEGORIAS_CUPON[0];
                      return <strong style={{ color: cat.color }}>{cat.label}</strong>;
                    })()}
                  </span>
                </div>
                <div className="dt6-property-row">
                  <span className="dt6-property-key">Porcentaje de Descuento:</span>
                  <span className="dt6-property-val" style={{ color: '#a259ff' }}>
                    {item.descuento}% de rebaja
                  </span>
                </div>
                <div className="dt6-property-row">
                  <span className="dt6-property-key">Vence el:</span>
                  <span className="dt6-property-val">
                    {item.expiracion?.toDate ? item.expiracion.toDate().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                  </span>
                </div>
                <div className="dt6-property-row">
                  <span className="dt6-property-key">Límite de canjes:</span>
                  <span className="dt6-property-val">
                    {item.usoMaximo ? `${item.usoMaximo} canjes permitidos` : 'Ilimitado (sin tope)'}
                  </span>
                </div>
                <div className="dt6-property-row">
                  <span className="dt6-property-key">Canjes Realizados:</span>
                  <span className="dt6-property-val" style={{ color: '#38bdf8' }}>
                    {usesCount} veces aplicado
                  </span>
                </div>
              </div>
            </div>

            {/* Historial de usuarios/emails que aplicaron el cupón */}
            <div className="dt6-detail-section">
              <div className="dt6-detail-section-title">
                <span className="material-icons" style={{ fontSize: 15 }}>history</span>
                Historial de Canjes Recientes ({usesCount})
              </div>
              {usesCount === 0 ? (
                <div className="cup-empty-uses">Aún no se ha canjeado este cupón por ningún usuario.</div>
              ) : (
                <div className="cup-users-list">
                  {(item.usadoPorEmails && item.usadoPorEmails.length > 0) ? (
                    item.usadoPorEmails.slice(0, 8).map((email, idx) => (
                      <div key={`email-${idx}`} className="cup-user-row">
                        <span className="material-icons" style={{ fontSize: 14, color: '#38bdf8' }}>mail_outline</span>
                        <span className="cup-user-id">{email}</span>
                        <span className="cup-user-badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>Canjeado</span>
                      </div>
                    ))
                  ) : (
                    (item.usadoPor || []).slice(0, 5).map((uid, idx) => (
                      <div key={`uid-${idx}`} className="cup-user-row">
                        <span className="material-icons" style={{ fontSize: 14, color: '#c4b5fd' }}>account_circle</span>
                        <span className="cup-user-id">{uid}</span>
                        <span className="cup-user-badge">Canjeado</span>
                      </div>
                    ))
                  )}
                  {usesCount > 8 && (
                    <div className="cup-more-users">+ {usesCount - 8} canjes adicionales</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-cupones-page">
      <DataTable6
        data={cupones}
        columns={columns}
        idKey="id"
        title="Gestión de Cupones"
        subtitle="Administra códigos promocionales, porcentajes de descuento y límites de canje con sincronización en tiempo real"
        searchPlaceholder="Buscar por código de cupón..."
        filterOptions={filterOptions}
        renderDetail={renderDetailPanel}
        selectedItem={isCreatingNew ? { id: 'new', codigo: form.codigo, descuento: form.descuento } : selectedCupon}
        onSelectItem={handleSelect}
        badgeText="DATA TABLE 6"
        extraHeaderActions={
          <button className="cup-btn-create" onClick={handleStartCreate}>
            <span className="material-icons" style={{ fontSize: 18 }}>add_circle</span>
            Nuevo Cupón
          </button>
        }
      />
    </div>
  );
}
