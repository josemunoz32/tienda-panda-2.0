import React, { useEffect, useState } from 'react';
import './AdminCupones.css';
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

const initialForm = {
  codigo: '',
  descuento: '',
  expiracion: '',
  usoMaximo: '',
  activo: true
};

export default function AdminCupones() {
  const [cupones, setCupones] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const cuponesRef = collection(db, 'cupones');

  const fetchCupones = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(cuponesRef);
      setCupones(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      setError('Error al cargar cupones');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCupones();
  }, []);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({
      ...f,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.codigo || !form.descuento || !form.expiracion) {
      setError('Completa todos los campos obligatorios');
      return;
    }
    try {
      const data = {
        codigo: form.codigo,
        descuento: Number(form.descuento),
        expiracion: Timestamp.fromDate(new Date(form.expiracion)),
        usoMaximo: form.usoMaximo ? Number(form.usoMaximo) : null,
        activo: form.activo,
        usadoPor: []
      };
      if (editId) {
        await updateDoc(doc(db, 'cupones', editId), data);
        setSuccess('Cupón actualizado');
      } else {
        await addDoc(cuponesRef, data);
        setSuccess('Cupón creado');
      }
      setForm(initialForm);
      setEditId(null);
      fetchCupones();
    } catch (e) {
      setError('Error al guardar el cupón');
    }
  };

  const handleEdit = cup => {
    setForm({
      codigo: cup.codigo,
      descuento: cup.descuento,
      expiracion: cup.expiracion.toDate().toISOString().slice(0, 10),
      usoMaximo: cup.usoMaximo || '',
      activo: cup.activo
    });
    setEditId(cup.id);
  };

  const handleDelete = async id => {
    if (!window.confirm('¿Eliminar este cupón?')) return;
    try {
      await deleteDoc(doc(db, 'cupones', id));
      setSuccess('Cupón eliminado');
      fetchCupones();
    } catch (e) {
      setError('Error al eliminar el cupón');
    }
  };

  return (
    <div className="cupones-admin-container">
      <h2 className="cupones-title">Administrar Cupones</h2>
      <form className="cupones-form" onSubmit={handleSubmit}>
        <input
          name="codigo"
          placeholder="Código"
          value={form.codigo}
          onChange={handleChange}
          required
        />
        <input
          name="descuento"
          placeholder="Descuento (%)"
          type="number"
          value={form.descuento}
          onChange={handleChange}
          required
        />
        <input
          name="expiracion"
          type="date"
          value={form.expiracion}
          onChange={handleChange}
          required
        />
        <input
          name="usoMaximo"
          placeholder="Usos máximos (opcional)"
          type="number"
          value={form.usoMaximo}
          onChange={handleChange}
        />
        <label className="cupones-checkbox">
          <input
            name="activo"
            type="checkbox"
            checked={form.activo}
            onChange={handleChange}
          />
          Activo
        </label>
        <button className="cupones-btn" type="submit" disabled={loading}>
          {editId ? 'Actualizar' : 'Crear'} Cupón
        </button>
        {error && <div className="cupones-error">{error}</div>}
        {success && <div className="cupones-success">{success}</div>}
      </form>
      <div className="cupones-table-container">
        <table className="cupones-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descuento (%)</th>
              <th>Expiración</th>
              <th>Usos máximos</th>
              <th>Activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cupones.map(cup => (
              <tr key={cup.id}>
                <td>{cup.codigo}</td>
                <td>{cup.descuento}</td>
                <td>{cup.expiracion.toDate().toLocaleDateString()}</td>
                <td>{cup.usoMaximo || '-'}</td>
                <td>{cup.activo ? 'Sí' : 'No'}</td>
                <td>
                  <button className="cupones-btn-edit" onClick={() => handleEdit(cup)}>Editar</button>
                  <button className="cupones-btn-delete" onClick={() => handleDelete(cup.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
