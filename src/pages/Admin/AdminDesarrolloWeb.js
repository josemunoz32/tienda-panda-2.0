import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebaseDb';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { ALL_PLANS_LIST, EXTRA_ADDONS } from '../DesarrolloWeb/DesarrolloWeb';

const formatCLP = (val) => {
  const n = Math.round(Number(val || 0));
  return `$${n.toLocaleString('es-CL')}`;
};

const addMonthsToDateStr = (dateStr, monthsToAdd = 1) => {
  const base = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  if (isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setMonth(fallback.getMonth() + monthsToAdd);
    return fallback.toISOString().split('T')[0];
  }
  base.setMonth(base.getMonth() + monthsToAdd);
  return base.toISOString().split('T')[0];
};

const formatDateCL = (dateStr) => {
  if (!dateStr) return 'Sin definir';
  const raw = String(dateStr).split('T')[0];
  const parts = raw.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('es-CL');
};

const getDaysUntil = (dateStr) => {
  if (!dateStr) return null;
  const raw = String(dateStr).split('T')[0];
  const target = new Date(`${raw}T23:59:59`);
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const getActiveDurationLabel = (startDateStr) => {
  if (!startDateStr) return 'Reciente';
  const raw = String(startDateStr).split('T')[0];
  const start = new Date(`${raw}T00:00:00`);
  if (isNaN(start.getTime())) return 'Reciente';
  const now = new Date();
  const diffDays = Math.max(0, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  if (diffDays < 1) return 'Hoy (Día 1)';
  if (diffDays < 30) return `${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
  const months = Math.floor(diffDays / 30);
  const remDays = diffDays % 30;
  return `${months} ${months === 1 ? 'mes' : 'meses'}${remDays > 0 ? ` y ${remDays}d` : ''}`;
};

// Detecta si un documento de la colección `orders` corresponde a Desarrollo Web
const isWebDevOrder = (order) => {
  if (!order) return false;
  if (order.tipoPedido === 'desarrollo_web') return true;
  if (order.shipping?.tipoServicio === 'desarrollo_web') return true;
  if (
    Array.isArray(order.productos) &&
    order.productos.some(
      (p) =>
        p?.category_id === 'desarrollo_web' ||
        p?.categoryId === 'desarrollo_web' ||
        String(p?.plataforma || '').toLowerCase() === 'desarrollo web'
    )
  ) {
    return true;
  }
  return false;
};

// Normaliza cualquier pedido web (automático de Mercado Pago, Transferencia o Manual)
const normalizeWebSubscription = (rawDoc) => {
  const ship = rawDoc.shipping || {};
  const productos = Array.isArray(rawDoc.productos) ? rawDoc.productos : [];

  const isPendingTransfer =
    (rawDoc.metodoPago === 'transferencia' &&
      rawDoc.transferenciaEstado === 'pendiente' &&
      ship.estadoSuscripcion !== 'activa') ||
    ship.estadoSuscripcion === 'pendiente_confirmacion';

  const estadoSuscripcion = isPendingTransfer
    ? 'pendiente_confirmacion'
    : ship.estadoSuscripcion ||
      (rawDoc.estado === 'exitoso' || rawDoc.status === 'approved' ? 'activa' : 'activa');

  // Extraer plan base y extras desde shipping o desde productos
  let planName = ship.planName || '';
  let planPriceCLP = Number(ship.planPriceCLP || 0);
  let extras = Array.isArray(ship.extras) ? ship.extras : [];

  if (!planName && productos.length > 0) {
    const planItem =
      productos.find((p) => String(p.id || '').startsWith('landing-') || String(p.id || '').startsWith('ecommerce-')) ||
      productos[0];
    if (planItem) {
      planName = planItem.name || 'Plan Web';
      planPriceCLP = Number(planItem.precio || planItem.priceCLP || 0);
    }
  }

  if (extras.length === 0 && productos.length > 0) {
    extras = productos
      .filter((p) => String(p.id || '').startsWith('addon-'))
      .map((p) => ({
        id: p.id,
        name: p.name,
        priceCLP: Number(p.precio || p.priceCLP || 0),
        billingType: p.billingType || (String(p.id || '').includes('dominio') ? 'annual' : 'monthly'),
      }));
  }

  const totalInicialCLP = Number(
    ship.totalInicialCLP || rawDoc.totalCLP || rawDoc.total || 0
  );

  const computedMonthly =
    Number(ship.monthlyRecurringCLP || rawDoc.monthlyRecurringCLP || 0) ||
    productos
      .filter((p) => p.billingType !== 'annual' && !String(p.id || '').includes('dominio'))
      .reduce((acc, p) => acc + Number(p.precio || p.priceCLP || 0), 0) ||
    totalInicialCLP;

  const cuotasPagadas =
    ship.cuotasPagadas !== undefined
      ? Number(ship.cuotasPagadas)
      : isPendingTransfer
      ? 0
      : 1;

  const fechaInicio =
    ship.fechaInicio ||
    (rawDoc.fecha ? String(rawDoc.fecha).split('T')[0] : new Date().toISOString().split('T')[0]);

  const proximoCobro =
    ship.proximoCobro || addMonthsToDateStr(fechaInicio, Math.max(1, cuotasPagadas));

  const totalRecaudadoCLP =
    ship.totalRecaudadoCLP !== undefined
      ? Number(ship.totalRecaudadoCLP)
      : cuotasPagadas > 0
      ? totalInicialCLP + Math.max(0, cuotasPagadas - 1) * computedMonthly
      : 0;

  return {
    id: rawDoc.id,
    raw: rawDoc,
    nombre: rawDoc.nombre || ship.nombreCliente || 'Cliente Web',
    email: rawDoc.email || ship.emailCliente || '',
    phone: rawDoc.phone || ship.phone || '',
    proyectoDominio: rawDoc.proyectoDominio || ship.proyectoDominio || '',
    metodoPago: rawDoc.metodoPago || 'mercadopago',
    banco: rawDoc.banco || ship.banco || '',
    comprobanteUrl: rawDoc.comprobanteUrl || null,
    comprobanteNombre: rawDoc.comprobanteNombre || ship.comprobanteNombre || null,
    estadoSuscripcion, // 'activa' | 'pendiente_confirmacion' | 'pausada' | 'cancelada'
    planId: ship.planId || '',
    planName: planName || 'Plan Desarrollo Web',
    planPriceCLP,
    extras,
    productos,
    monthlyRecurringCLP: computedMonthly,
    annualDomainCLP: Number(ship.annualDomainCLP || rawDoc.annualDomainCLP || 0),
    totalInicialCLP,
    totalRecaudadoCLP,
    cuotasPagadas,
    fechaInicio,
    proximoCobro,
    notasAdmin: ship.notasAdmin || '',
    historialPagos: Array.isArray(ship.historialPagos) ? ship.historialPagos : [],
    fechaCreacion: rawDoc.fecha || new Date().toISOString(),
  };
};

export default function AdminDesarrolloWeb({ user }) {
  const [webOrders, setWebOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'active' | 'pending' | 'due' | 'paused'
  const [searchQuery, setSearchQuery] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Modal de Crear / Editar Suscripción Web Manual
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [savingForm, setSavingForm] = useState(false);

  const todayISO = new Date().toISOString().split('T')[0];
  const nextMonthISO = addMonthsToDateStr(todayISO, 1);

  const [formState, setFormState] = useState({
    nombre: '',
    email: '',
    phone: '',
    proyectoDominio: '',
    planId: 'landing-basica',
    addonIds: [],
    domainExt: 'cl',
    customMonthlyCLP: '',
    customTotalInicialCLP: '',
    metodoPago: 'transferencia',
    banco: 'BancoEstado',
    estadoSuscripcion: 'activa',
    cuotasPagadas: 1,
    fechaInicio: todayISO,
    proximoCobro: nextMonthISO,
    notasAdmin: '',
  });

  // Escuchar en tiempo real todos los pedidos de Desarrollo Web en `orders`
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const list = [];
        snap.forEach((docSnap) => {
          const data = { id: docSnap.id, ...docSnap.data() };
          if (isWebDevOrder(data)) {
            list.push(normalizeWebSubscription(data));
          }
        });
        list.sort(
          (a, b) =>
            new Date(b.fechaCreacion || 0).getTime() -
            new Date(a.fechaCreacion || 0).getTime()
        );
        setWebOrders(list);
        setLoading(false);
      },
      (err) => {
        console.error('Error cargando suscripciones web:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const notify = (msg) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 3200);
  };

  // Cálculo automático de precios sugeridos en el formulario manual
  const formPlanObj = useMemo(
    () => ALL_PLANS_LIST.find((p) => p.id === formState.planId) || ALL_PLANS_LIST[0],
    [formState.planId]
  );

  const formAddonsResolved = useMemo(() => {
    return formState.addonIds
      .map((id) => {
        const base = EXTRA_ADDONS.find((a) => a.id === id);
        if (!base) return null;
        if (base.isDomainSelector) {
          const opt = base.domainOptions[formState.domainExt] || base.domainOptions.cl;
          return {
            id: `addon-dominio-${opt.ext}`,
            baseId: 'addon-dominio',
            name: opt.label,
            priceCLP: opt.priceCLP,
            billingType: 'annual',
          };
        }
        return {
          id: base.id,
          baseId: base.id,
          name: base.title,
          priceCLP: base.priceCLP,
          billingType: 'monthly',
        };
      })
      .filter(Boolean);
  }, [formState.addonIds, formState.domainExt]);

  const suggestedMonthlyCLP = useMemo(() => {
    const planPrice = Number(formPlanObj?.priceCLP || 0);
    const monthlyExtras = formAddonsResolved
      .filter((a) => a.billingType === 'monthly')
      .reduce((s, a) => s + Number(a.priceCLP || 0), 0);
    return planPrice + monthlyExtras;
  }, [formPlanObj, formAddonsResolved]);

  const suggestedAnnualCLP = useMemo(() => {
    return formAddonsResolved
      .filter((a) => a.billingType === 'annual')
      .reduce((s, a) => s + Number(a.priceCLP || 0), 0);
  }, [formAddonsResolved]);

  const suggestedInitialTotalCLP = suggestedMonthlyCLP + suggestedAnnualCLP;

  // Abrir modal para agregar nueva web manual
  const handleOpenNewModal = () => {
    setEditingId(null);
    setFormState({
      nombre: '',
      email: '',
      phone: '',
      proyectoDominio: '',
      planId: 'landing-basica',
      addonIds: [],
      domainExt: 'cl',
      customMonthlyCLP: '',
      customTotalInicialCLP: '',
      metodoPago: 'transferencia',
      banco: 'BancoEstado',
      estadoSuscripcion: 'activa',
      cuotasPagadas: 1,
      fechaInicio: todayISO,
      proximoCobro: nextMonthISO,
      notasAdmin: '',
    });
    setModalOpen(true);
  };

  // Abrir modal para editar un registro existente
  const handleOpenEditModal = (sub) => {
    setEditingId(sub.id);
    const detectedAddonIds = [];
    let detectedExt = 'cl';
    (sub.extras || []).forEach((ex) => {
      if (String(ex.id || '').includes('addon-dominio')) {
        detectedAddonIds.push('addon-dominio');
        if (String(ex.id).endsWith('com') || String(ex.name).includes('.com')) {
          detectedExt = 'com';
        }
      } else if (EXTRA_ADDONS.some((a) => a.id === ex.id)) {
        detectedAddonIds.push(ex.id);
      }
    });

    setFormState({
      nombre: sub.nombre || '',
      email: sub.email || '',
      phone: sub.phone || '',
      proyectoDominio: sub.proyectoDominio || '',
      planId: sub.planId && ALL_PLANS_LIST.some((p) => p.id === sub.planId) ? sub.planId : 'landing-basica',
      addonIds: Array.from(new Set(detectedAddonIds)),
      domainExt: detectedExt,
      customMonthlyCLP: String(sub.monthlyRecurringCLP || ''),
      customTotalInicialCLP: String(sub.totalInicialCLP || ''),
      metodoPago: sub.metodoPago || 'transferencia',
      banco: sub.banco || 'BancoEstado',
      estadoSuscripcion: sub.estadoSuscripcion || 'activa',
      cuotasPagadas: Number(sub.cuotasPagadas || 0),
      fechaInicio: sub.fechaInicio || todayISO,
      proximoCobro: sub.proximoCobro || nextMonthISO,
      notasAdmin: sub.notasAdmin || '',
    });
    setModalOpen(true);
  };

  // Guardar nueva suscripción web o actualizar existente
  const handleSaveSubscription = async (e) => {
    e.preventDefault();
    if (!formState.nombre.trim()) return;
    setSavingForm(true);

    try {
      const finalMonthlyCLP =
        formState.customMonthlyCLP !== '' && !isNaN(Number(formState.customMonthlyCLP))
          ? Math.round(Number(formState.customMonthlyCLP))
          : suggestedMonthlyCLP;

      const finalInitialCLP =
        formState.customTotalInicialCLP !== '' && !isNaN(Number(formState.customTotalInicialCLP))
          ? Math.round(Number(formState.customTotalInicialCLP))
          : finalMonthlyCLP + suggestedAnnualCLP;

      const cuotas = Math.max(0, Number(formState.cuotasPagadas || 0));
      const totalRecaudado =
        cuotas > 0
          ? finalInitialCLP + Math.max(0, cuotas - 1) * finalMonthlyCLP
          : 0;

      const productosList = [
        {
          id: formPlanObj.id,
          name: `Plan ${formPlanObj.name}`,
          cantidad: 1,
          precio: Number(formPlanObj.priceCLP),
          category_id: 'desarrollo_web',
          categoryId: 'desarrollo_web',
          categoryName: 'Desarrollo Web',
          plataforma: 'Desarrollo Web',
          billingType: 'monthly',
        },
        ...formAddonsResolved.map((a) => ({
          id: a.id,
          name: a.name,
          cantidad: 1,
          precio: Number(a.priceCLP),
          category_id: 'desarrollo_web',
          categoryId: 'desarrollo_web',
          categoryName: 'Desarrollo Web',
          plataforma: 'Desarrollo Web',
          billingType: a.billingType,
        })),
      ];

      const shippingMeta = {
        tipoServicio: 'desarrollo_web',
        estadoSuscripcion: formState.estadoSuscripcion,
        planId: formPlanObj.id,
        planName: formPlanObj.name,
        planPriceCLP: Number(formPlanObj.priceCLP),
        extras: formAddonsResolved.map((a) => ({
          id: a.id,
          name: a.name,
          priceCLP: Number(a.priceCLP),
          billingType: a.billingType,
        })),
        monthlyRecurringCLP: finalMonthlyCLP,
        annualDomainCLP: suggestedAnnualCLP,
        totalInicialCLP: finalInitialCLP,
        totalRecaudadoCLP: totalRecaudado,
        cuotasPagadas: cuotas,
        fechaInicio: formState.fechaInicio || todayISO,
        proximoCobro: formState.proximoCobro || nextMonthISO,
        proyectoDominio: formState.proyectoDominio.trim(),
        phone: formState.phone.trim(),
        banco: formState.banco,
        notasAdmin: formState.notasAdmin.trim(),
      };

      const payload = {
        tipoPedido: 'desarrollo_web',
        nombre: formState.nombre.trim(),
        email: formState.email.trim(),
        phone: formState.phone.trim(),
        proyectoDominio: formState.proyectoDominio.trim(),
        metodoPago: formState.metodoPago,
        banco: formState.banco,
        transferenciaEstado:
          formState.estadoSuscripcion === 'pendiente_confirmacion' ? 'pendiente' : 'aprobado',
        estado:
          formState.estadoSuscripcion === 'pendiente_confirmacion' ? 'pendiente' : 'exitoso',
        moneda: 'CLP',
        subtotal: finalInitialCLP,
        subtotalCLP: finalInitialCLP,
        total: finalInitialCLP,
        totalCLP: finalInitialCLP,
        monthlyRecurringCLP: finalMonthlyCLP,
        annualDomainCLP: suggestedAnnualCLP,
        productos: productosList,
        shipping: shippingMeta,
      };

      if (editingId) {
        await updateDoc(doc(db, 'orders', editingId), payload);
        notify('✓ Suscripción web actualizada correctamente');
      } else {
        await addDoc(collection(db, 'orders'), {
          ...payload,
          uid: user?.uid || 'guest',
          fecha: new Date().toISOString(),
        });
        notify('✓ Nueva suscripción web registrada en el sistema');
      }
      setModalOpen(false);
    } catch (err) {
      alert('Error al guardar: ' + (err.message || err));
    } finally {
      setSavingForm(false);
    }
  };

  // Confirmar manualmente un pago por Transferencia Bancaria
  const handleConfirmTransferPayment = async (sub) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const nextDue = addMonthsToDateStr(today, 1);
      const updatedShipping = {
        ...(sub.raw.shipping || {}),
        tipoServicio: 'desarrollo_web',
        estadoSuscripcion: 'activa',
        cuotasPagadas: Math.max(1, Number(sub.cuotasPagadas || 0)),
        fechaInicio: sub.fechaInicio || today,
        proximoCobro: nextDue,
        totalRecaudadoCLP: Number(sub.totalInicialCLP || sub.monthlyRecurringCLP || 0),
        historialPagos: [
          ...(sub.historialPagos || []),
          {
            cuotaNumero: 1,
            montoCLP: Number(sub.totalInicialCLP || sub.monthlyRecurringCLP || 0),
            fecha: new Date().toISOString(),
            nota: 'Transferencia inicial confirmada por Admin',
          },
        ],
      };

      await updateDoc(doc(db, 'orders', sub.id), {
        transferenciaEstado: 'aprobado',
        estado: 'exitoso',
        status: 'approved',
        shipping: updatedShipping,
      });
      notify(`✓ Pago confirmado y web de ${sub.nombre} activada (Cuota #1)`);
    } catch (err) {
      alert('No se pudo confirmar el pago: ' + (err.message || err));
    }
  };

  // Registrar el pago de una nueva cuota mensual (+1 cuota y avanza próximo cobro 1 mes)
  const handleRegisterNextInstallment = async (sub) => {
    try {
      const nextCuotaNum = Number(sub.cuotasPagadas || 0) + 1;
      const quotaAmount = Number(sub.monthlyRecurringCLP || 0);
      const newTotalRecaudado =
        Number(sub.totalRecaudadoCLP || 0) +
        (nextCuotaNum === 1 ? Number(sub.totalInicialCLP || quotaAmount) : quotaAmount);
      const nextDue = addMonthsToDateStr(sub.proximoCobro || todayISO, 1);

      const updatedShipping = {
        ...(sub.raw.shipping || {}),
        tipoServicio: 'desarrollo_web',
        estadoSuscripcion: 'activa',
        cuotasPagadas: nextCuotaNum,
        proximoCobro: nextDue,
        totalRecaudadoCLP: newTotalRecaudado,
        historialPagos: [
          ...(sub.historialPagos || []),
          {
            cuotaNumero: nextCuotaNum,
            montoCLP: quotaAmount,
            fecha: new Date().toISOString(),
            nota: `Cuota mensual #${nextCuotaNum} registrada`,
          },
        ],
      };

      await updateDoc(doc(db, 'orders', sub.id), {
        transferenciaEstado: 'aprobado',
        estado: 'exitoso',
        shipping: updatedShipping,
      });
      notify(`✓ Cuota #${nextCuotaNum} (${formatCLP(quotaAmount)} CLP) registrada para ${sub.nombre}`);
    } catch (err) {
      alert('Error al registrar cuota: ' + (err.message || err));
    }
  };

  // Cambiar fecha de próximo pago directamente
  const handleQuickDateChange = async (sub, newDateStr) => {
    if (!newDateStr) return;
    try {
      await updateDoc(doc(db, 'orders', sub.id), {
        shipping: {
          ...(sub.raw.shipping || {}),
          tipoServicio: 'desarrollo_web',
          proximoCobro: newDateStr,
        },
      });
      notify(`✓ Fecha de próximo pago actualizada al ${formatDateCL(newDateStr)}`);
    } catch (err) {
      alert('Error al actualizar fecha: ' + (err.message || err));
    }
  };

  // Cambiar estado (Activa / Pausada / Cancelada)
  const handleChangeStatus = async (sub, newStatus) => {
    try {
      await updateDoc(doc(db, 'orders', sub.id), {
        shipping: {
          ...(sub.raw.shipping || {}),
          tipoServicio: 'desarrollo_web',
          estadoSuscripcion: newStatus,
        },
      });
      notify(`✓ Estado actualizado a ${newStatus.toUpperCase()}`);
    } catch (err) {
      alert('Error al cambiar estado: ' + (err.message || err));
    }
  };

  // Eliminar registro
  const handleDeleteSubscription = async (sub) => {
    if (!window.confirm(`¿Eliminar el registro web de "${sub.nombre}" (${sub.proyectoDominio || sub.planName})?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'orders', sub.id));
      notify('Registro eliminado');
    } catch (err) {
      alert('Error al eliminar: ' + (err.message || err));
    }
  };

  // Métricas globales
  const metrics = useMemo(() => {
    const activeList = webOrders.filter((o) => o.estadoSuscripcion === 'activa');
    const pendingList = webOrders.filter((o) => o.estadoSuscripcion === 'pendiente_confirmacion');
    const dueSoonOrOverdue = activeList.filter((o) => {
      const days = getDaysUntil(o.proximoCobro);
      return days !== null && days <= 5;
    });
    const mrrCLP = activeList.reduce((acc, o) => acc + Number(o.monthlyRecurringCLP || 0), 0);
    const totalCollectedCLP = webOrders.reduce(
      (acc, o) => acc + Number(o.totalRecaudadoCLP || 0),
      0
    );

    return {
      totalCount: webOrders.length,
      activeCount: activeList.length,
      pendingCount: pendingList.length,
      dueCount: dueSoonOrOverdue.length,
      mrrCLP,
      totalCollectedCLP,
    };
  }, [webOrders]);

  // Lista filtrada
  const filteredOrders = useMemo(() => {
    return webOrders.filter((sub) => {
      if (filterTab === 'active' && sub.estadoSuscripcion !== 'activa') return false;
      if (filterTab === 'pending' && sub.estadoSuscripcion !== 'pendiente_confirmacion') return false;
      if (filterTab === 'paused' && !['pausada', 'cancelada'].includes(sub.estadoSuscripcion)) return false;
      if (filterTab === 'due') {
        const d = getDaysUntil(sub.proximoCobro);
        if (sub.estadoSuscripcion !== 'activa' || d === null || d > 5) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = [
          sub.nombre,
          sub.email,
          sub.phone,
          sub.proyectoDominio,
          sub.planName,
          ...(sub.extras || []).map((e) => e.name),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [webOrders, filterTab, searchQuery]);

  const buildClientWspReminder = (sub) => {
    const cleanPhone = String(sub.phone || '').replace(/[^0-9]/g, '');
    const targetPhone = cleanPhone.startsWith('56')
      ? cleanPhone
      : cleanPhone.length === 9
      ? `56${cleanPhone}`
      : cleanPhone;
    const msg = `¡Hola ${sub.nombre}! Te escribimos de PandaStore Desarrollo Web por tu sitio ${
      sub.proyectoDominio ? `(${sub.proyectoDominio})` : `(${sub.planName})`
    }. Tu cuota mensual de ${formatCLP(sub.monthlyRecurringCLP)} CLP corresponde al ${formatDateCL(
      sub.proximoCobro
    )}. ¿Cómo estás?`;
    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div style={{ padding: '20px 24px 60px', color: '#f1f5f9', maxWidth: 1360, margin: '0 auto' }}>
      {/* Notificación flotante Admin */}
      {feedbackMsg && (
        <div
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 9999,
            background: '#0f172a',
            border: '1.5px solid #22c55e',
            color: '#4ade80',
            padding: '12px 18px',
            borderRadius: 12,
            fontWeight: 800,
            fontSize: 13.5,
            boxShadow: '0 14px 34px rgba(0,0,0,0.5)',
          }}
        >
          {feedbackMsg}
        </div>
      )}

      {/* Encabezado Principal */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
          background: 'linear-gradient(135deg, rgba(30, 17, 60, 0.9), rgba(15, 23, 42, 0.92))',
          border: '1px solid rgba(162, 89, 255, 0.3)',
          borderRadius: 20,
          padding: '22px 26px',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              fontSize: 11,
              fontWeight: 800,
              color: '#c4b5fd',
              background: 'rgba(124, 58, 237, 0.2)',
              padding: '4px 10px',
              borderRadius: 99,
              marginBottom: 6,
              letterSpacing: 0.6,
            }}
          >
            CONTROL DE SUSCRIPCIONES WEB • CLP
          </span>
          <h1 style={{ margin: '0 0 4px 0', fontSize: 24, fontWeight: 900, color: '#ffffff' }}>
            Plantilla de Páginas Web, Cuotas y Pagos Mensuales
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, color: '#94a3b8' }}>
            Se sincroniza automáticamente con compras por Mercado Pago y Transferencia, o agrega clientes manualmente.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNewModal}
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 12,
            padding: '13px 20px',
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 10px 24px rgba(124, 58, 237, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>＋ Agregar Web / Cliente Manual</span>
        </button>
      </div>

      {/* Tarjetas de KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 14,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: '16px 18px',
          }}
        >
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Webs Activas</span>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#4ade80', marginTop: 4 }}>
            {metrics.activeCount}
          </div>
          <small style={{ fontSize: 11.5, color: '#64748b' }}>
            De {metrics.totalCount} registros totales
          </small>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(162, 89, 255, 0.3)',
            borderRadius: 16,
            padding: '16px 18px',
          }}
        >
          <span style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 700 }}>
            Ingreso Mensual Recurrente (MRR)
          </span>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#ffffff', marginTop: 4 }}>
            {formatCLP(metrics.mrrCLP)} CLP
          </div>
          <small style={{ fontSize: 11.5, color: '#a78bfa' }}>Suma de cuotas mensuales activas</small>
        </div>

        <div
          style={{
            background:
              metrics.pendingCount > 0
                ? 'rgba(245, 158, 11, 0.14)'
                : 'rgba(15, 23, 42, 0.85)',
            border: `1px solid ${
              metrics.pendingCount > 0 ? '#f59e0b' : 'rgba(255,255,255,0.1)'
            }`,
            borderRadius: 16,
            padding: '16px 18px',
          }}
        >
          <span style={{ fontSize: 12, color: '#fcd34d', fontWeight: 700 }}>
            Transferencias por Confirmar
          </span>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fbbf24', marginTop: 4 }}>
            {metrics.pendingCount}
          </div>
          <small style={{ fontSize: 11.5, color: '#fde68a' }}>
            Requieren tu aprobación manual
          </small>
        </div>

        <div
          style={{
            background:
              metrics.dueCount > 0
                ? 'rgba(239, 68, 68, 0.14)'
                : 'rgba(15, 23, 42, 0.85)',
            border: `1px solid ${
              metrics.dueCount > 0 ? '#ef4444' : 'rgba(255,255,255,0.1)'
            }`,
            borderRadius: 16,
            padding: '16px 18px',
          }}
        >
          <span style={{ fontSize: 12, color: '#fca5a5', fontWeight: 700 }}>
            Por Cobrar Pronto / Vencidas
          </span>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#f87171', marginTop: 4 }}>
            {metrics.dueCount}
          </div>
          <small style={{ fontSize: 11.5, color: '#fecaca' }}>
            Vencen en ≤ 5 días o atrasadas
          </small>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: '16px 18px',
          }}
        >
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
            Total Histórico Recaudado
          </span>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#38bdf8', marginTop: 4 }}>
            {formatCLP(metrics.totalCollectedCLP)} CLP
          </div>
          <small style={{ fontSize: 11.5, color: '#64748b' }}>Acumulado en cuotas web</small>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { id: 'all', label: `Todas (${webOrders.length})` },
            { id: 'pending', label: `🟠 Por Confirmar Transferencia (${metrics.pendingCount})` },
            { id: 'active', label: `🟢 Activas (${metrics.activeCount})` },
            { id: 'due', label: `🔴 Próximo Pago / Atrasadas (${metrics.dueCount})` },
            { id: 'paused', label: '⏸️ Pausadas / Bajas' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              style={{
                background:
                  filterTab === tab.id ? '#7c3aed' : 'rgba(255, 255, 255, 0.06)',
                color: '#ffffff',
                border: `1px solid ${
                  filterTab === tab.id ? '#a78bfa' : 'rgba(255, 255, 255, 0.12)'
                }`,
                borderRadius: 99,
                padding: '8px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Buscar por cliente, dominio, correo o plan..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            minWidth: 280,
            padding: '10px 14px',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'rgba(15, 23, 42, 0.9)',
            color: '#ffffff',
            fontSize: 13,
          }}
        />
      </div>

      {/* Lista de Suscripciones Web */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
          Cargando suscripciones web en tiempo real...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px dashed rgba(255,255,255,0.18)',
            borderRadius: 20,
            padding: 44,
            textAlign: 'center',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0', color: '#e2e8f0' }}>
            No hay páginas web en esta vista
          </h3>
          <p style={{ margin: '0 0 18px 0', color: '#94a3b8', fontSize: 13.5 }}>
            Cuando un cliente compre con Mercado Pago o Transferencia en /desarrollo-web aparecerá aquí automáticamente, o puedes agregarlo manualmente.
          </p>
          <button
            type="button"
            onClick={handleOpenNewModal}
            style={{
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            ＋ Agregar Primera Web Manualmente
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredOrders.map((sub) => {
            const daysUntilDue = getDaysUntil(sub.proximoCobro);
            const isOverdue =
              sub.estadoSuscripcion === 'activa' && daysUntilDue !== null && daysUntilDue < 0;
            const isDueSoon =
              sub.estadoSuscripcion === 'activa' &&
              daysUntilDue !== null &&
              daysUntilDue >= 0 &&
              daysUntilDue <= 5;
            const isPending = sub.estadoSuscripcion === 'pendiente_confirmacion';

            return (
              <div
                key={sub.id}
                style={{
                  background: 'rgba(15, 23, 42, 0.92)',
                  border: `1.5px solid ${
                    isPending
                      ? '#f59e0b'
                      : isOverdue
                      ? '#ef4444'
                      : isDueSoon
                      ? '#eab308'
                      : 'rgba(255, 255, 255, 0.12)'
                  }`,
                  borderRadius: 20,
                  padding: '20px 22px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
                }}
              >
                {/* Cintillo superior si requiere confirmación manual de transferencia */}
                {isPending && (
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid #f59e0b',
                      borderRadius: 12,
                      padding: '12px 16px',
                      marginBottom: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 12,
                    }}
                  >
                    <div>
                      <strong style={{ color: '#fbbf24', fontSize: 13.5, display: 'block' }}>
                        ⏳ PAGO CON TRANSFERENCIA PENDIENTE DE CONFIRMACIÓN MANUAL
                      </strong>
                      <span style={{ fontSize: 12.5, color: '#fde68a' }}>
                        Banco destino: <strong>{sub.banco || 'Cuenta Oficial'}</strong> • Monto transferido:{' '}
                        <strong>{formatCLP(sub.totalInicialCLP)} CLP</strong>
                        {sub.comprobanteNombre ? ` • Archivo: ${sub.comprobanteNombre}` : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {sub.comprobanteUrl && (
                        <a
                          href={sub.comprobanteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: 'rgba(56, 189, 248, 0.2)',
                            border: '1px solid #38bdf8',
                            color: '#38bdf8',
                            padding: '8px 14px',
                            borderRadius: 10,
                            fontSize: 12.5,
                            fontWeight: 800,
                            textDecoration: 'none',
                          }}
                        >
                          📎 Ver Comprobante
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleConfirmTransferPayment(sub)}
                        style={{
                          background: '#16a34a',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 10,
                          padding: '9px 16px',
                          fontSize: 13,
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        ✓ Confirmar Transferencia y Activar Web
                      </button>
                    </div>
                  </div>
                )}

                {/* Fila Principal de Información */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: 18,
                    alignItems: 'start',
                  }}
                >
                  {/* Columna 1: Cliente y Dominio */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: 99,
                          background:
                            sub.estadoSuscripcion === 'activa'
                              ? 'rgba(34, 197, 94, 0.18)'
                              : isPending
                              ? 'rgba(245, 158, 11, 0.2)'
                              : 'rgba(148, 163, 184, 0.2)',
                          color:
                            sub.estadoSuscripcion === 'activa'
                              ? '#4ade80'
                              : isPending
                              ? '#fbbf24'
                              : '#cbd5e1',
                          textTransform: 'uppercase',
                        }}
                      >
                        {sub.estadoSuscripcion === 'activa'
                          ? '● SUSCRIPCIÓN ACTIVA'
                          : isPending
                          ? '● PENDIENTE CONFIRMAR'
                          : `● ${sub.estadoSuscripcion}`}
                      </span>

                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 800,
                          padding: '3px 9px',
                          borderRadius: 99,
                          background:
                            sub.metodoPago === 'mercadopago'
                              ? 'rgba(0, 158, 227, 0.18)'
                              : 'rgba(162, 89, 255, 0.18)',
                          color: sub.metodoPago === 'mercadopago' ? '#38bdf8' : '#c4b5fd',
                        }}
                      >
                        {sub.metodoPago === 'mercadopago'
                          ? '💳 Mercado Pago (Auto)'
                          : `🏦 Transferencia ${sub.banco ? `(${sub.banco})` : ''}`}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 800, color: '#ffffff' }}>
                      {sub.nombre}
                    </h3>

                    {sub.proyectoDominio && (
                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 800,
                          color: '#38bdf8',
                          marginBottom: 4,
                        }}
                      >
                        🌐 Web / Dominio: {sub.proyectoDominio}
                      </div>
                    )}

                    <div style={{ fontSize: 12.5, color: '#94a3b8', lineHeight: 1.5 }}>
                      {sub.email && <div>✉️ {sub.email}</div>}
                      {sub.phone && <div>📱 {sub.phone}</div>}
                    </div>
                  </div>

                  {/* Columna 2: Qué Plan y Extras Tiene Contratados */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 14,
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: '#a78bfa',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                      }}
                    >
                      Plan y Extras Contratados
                    </div>

                    <div
                      style={{
                        fontSize: 14.5,
                        fontWeight: 800,
                        color: '#ffffff',
                        marginBottom: 8,
                      }}
                    >
                      📦 {sub.planName}{' '}
                      {sub.planPriceCLP > 0 && (
                        <span style={{ color: '#4ade80', fontSize: 13 }}>
                          ({formatCLP(sub.planPriceCLP)}/mes)
                        </span>
                      )}
                    </div>

                    {sub.extras && sub.extras.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {sub.extras.map((ex, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              background: 'rgba(124, 58, 237, 0.18)',
                              border: '1px solid rgba(167, 139, 250, 0.35)',
                              color: '#e9d5ff',
                              padding: '3px 9px',
                              borderRadius: 8,
                            }}
                          >
                            + {ex.name} ({formatCLP(ex.priceCLP)})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#64748b' }}>Sin módulos extras</div>
                    )}

                    {sub.notasAdmin && (
                      <div
                        style={{
                          marginTop: 8,
                          paddingTop: 6,
                          borderTop: '1px dashed rgba(255,255,255,0.1)',
                          fontSize: 12,
                          color: '#cbd5e1',
                        }}
                      >
                        📝 Nota: {sub.notasAdmin}
                      </div>
                    )}
                  </div>

                  {/* Columna 3: Montos en CLP (Cuota Mensual, Pago Inicial y Recaudado) */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 14,
                      padding: '12px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: '#4ade80',
                        textTransform: 'uppercase',
                        marginBottom: 6,
                      }}
                    >
                      Valores en CLP
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#94a3b8' }}>Cuota Mensual:</span>
                      <strong style={{ color: '#4ade80', fontSize: 15 }}>
                        {formatCLP(sub.monthlyRecurringCLP)} CLP / mes
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                      <span style={{ color: '#94a3b8' }}>Primer Pago (Inicial):</span>
                      <strong style={{ color: '#f8fafc' }}>{formatCLP(sub.totalInicialCLP)} CLP</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: '#94a3b8' }}>Total Pagado Acumulado:</span>
                      <strong style={{ color: '#38bdf8' }}>{formatCLP(sub.totalRecaudadoCLP)} CLP</strong>
                    </div>
                  </div>

                  {/* Columna 4: Tiempo Activo, Cuotas Pagadas y Próxima Fecha de Cobro */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 14,
                      padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>
                        ⏱️ Tiempo: <strong style={{ color: '#fff' }}>{getActiveDurationLabel(sub.fechaInicio)}</strong>
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          background: 'rgba(56, 189, 248, 0.16)',
                          color: '#38bdf8',
                          padding: '2px 8px',
                          borderRadius: 8,
                        }}
                      >
                        {sub.cuotasPagadas} {sub.cuotasPagadas === 1 ? 'cuota pagada' : 'cuotas pagadas'}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
                      📅 Próximo pago:{' '}
                      <strong
                        style={{
                          color: isOverdue ? '#f87171' : isDueSoon ? '#facc15' : '#ffffff',
                        }}
                      >
                        {formatDateCL(sub.proximoCobro)}
                      </strong>{' '}
                      {sub.estadoSuscripcion === 'activa' && daysUntilDue !== null && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: isOverdue ? '#f87171' : isDueSoon ? '#facc15' : '#4ade80',
                          }}
                        >
                          {isOverdue
                            ? `(Atrasado ${Math.abs(daysUntilDue)}d)`
                            : daysUntilDue === 0
                            ? '(Vence Hoy)'
                            : `(En ${daysUntilDue}d)`}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input
                        type="date"
                        value={String(sub.proximoCobro || '').split('T')[0]}
                        onChange={(e) => handleQuickDateChange(sub, e.target.value)}
                        style={{
                          background: '#0f172a',
                          border: '1px solid rgba(255,255,255,0.18)',
                          color: '#fff',
                          borderRadius: 8,
                          padding: '4px 8px',
                          fontSize: 11.5,
                          flex: 1,
                        }}
                        title="Cambiar fecha del próximo cobro"
                      />
                      <button
                        type="button"
                        onClick={() => handleRegisterNextInstallment(sub)}
                        style={{
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '6px 10px',
                          fontSize: 11.5,
                          fontWeight: 800,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                        title="Sumar 1 cuota mensual pagada y avanzar 1 mes la fecha de cobro"
                      >
                        +1 Cuota Pagada
                      </button>
                    </div>
                  </div>
                </div>

                {/* Barra Inferior de Acciones por Cliente */}
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>
                    ID Registro: #{sub.id} • Inicio: {formatDateCL(sub.fechaInicio)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {sub.phone && (
                      <a
                        href={buildClientWspReminder(sub)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: 'rgba(34, 197, 94, 0.16)',
                          border: '1px solid #22c55e',
                          color: '#4ade80',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        💬 Avisar Cobro por WhatsApp
                      </a>
                    )}

                    {sub.comprobanteUrl && (
                      <a
                        href={sub.comprobanteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: 'rgba(56, 189, 248, 0.14)',
                          border: '1px solid rgba(56, 189, 248, 0.4)',
                          color: '#38bdf8',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        📎 Comprobante
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(sub)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        color: '#f8fafc',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ Editar Todo
                    </button>

                    {sub.estadoSuscripcion === 'activa' ? (
                      <button
                        type="button"
                        onClick={() => handleChangeStatus(sub, 'pausada')}
                        style={{
                          background: 'rgba(245, 158, 11, 0.14)',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          color: '#fbbf24',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ⏸️ Pausar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleChangeStatus(sub, 'activa')}
                        style={{
                          background: 'rgba(34, 197, 94, 0.16)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          color: '#4ade80',
                          borderRadius: 8,
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ▶️ Activar
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteSubscription(sub)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#f87171',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ MODAL PARA AGREGAR O EDITAR SUSCRIPCIÓN WEB MANUALMENTE ══════ */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 3, 14, 0.82)',
            backdropFilter: 'blur(6px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1.5px solid rgba(162, 89, 255, 0.4)',
              borderRadius: 20,
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px 26px',
              color: '#f8fafc',
              boxShadow: '0 24px 60px rgba(0,0,0,0.65)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
                {editingId ? 'Editar Suscripción / Página Web' : 'Registrar Nueva Página Web Manual'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: '#fff',
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Datos del Cliente */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Nombre del Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={formState.nombre}
                    onChange={(e) => setFormState({ ...formState, nombre: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: '#1e293b',
                      color: '#fff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Dominio / Nombre de la Web
                  </label>
                  <input
                    type="text"
                    value={formState.proyectoDominio}
                    onChange={(e) => setFormState({ ...formState, proyectoDominio: e.target.value })}
                    placeholder="Ej: mitienda.cl"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: '#1e293b',
                      color: '#fff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                    placeholder="Ej: +56912345678"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: '#1e293b',
                      color: '#fff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    placeholder="cliente@correo.cl"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: '#1e293b',
                      color: '#fff',
                    }}
                  />
                </div>
              </div>

              {/* Selección de Plan Base y Extras */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  padding: 14,
                }}
              >
                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#c4b5fd', marginBottom: 8 }}>
                  Plan Base Contratado
                </label>
                <select
                  value={formState.planId}
                  onChange={(e) =>
                    setFormState({
                      ...formState,
                      planId: e.target.value,
                      customMonthlyCLP: '',
                      customTotalInicialCLP: '',
                    })
                  }
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: '#1e293b',
                    color: '#fff',
                    fontSize: 13.5,
                    fontWeight: 700,
                    marginBottom: 12,
                  }}
                >
                  {ALL_PLANS_LIST.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.price} / mes ({p.tier})
                    </option>
                  ))}
                </select>

                <label style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: '#c4b5fd', marginBottom: 8 }}>
                  Extras Incluidos
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {EXTRA_ADDONS.map((addon) => {
                    const checked = formState.addonIds.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() => {
                          const exists = formState.addonIds.includes(addon.id);
                          const nextIds = exists
                            ? formState.addonIds.filter((id) => id !== addon.id)
                            : [...formState.addonIds, addon.id];
                          setFormState({
                            ...formState,
                            addonIds: nextIds,
                            customMonthlyCLP: '',
                            customTotalInicialCLP: '',
                          });
                        }}
                        style={{
                          background: checked ? 'rgba(34, 197, 94, 0.2)' : '#1e293b',
                          border: `1px solid ${checked ? '#22c55e' : 'rgba(255,255,255,0.16)'}`,
                          color: checked ? '#4ade80' : '#cbd5e1',
                          borderRadius: 10,
                          padding: '8px 12px',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {checked ? '✓ ' : '+ '}
                        {addon.shortTitle} ({addon.isDomainSelector ? `.${formState.domainExt}` : addon.price})
                      </button>
                    );
                  })}
                </div>

                {formState.addonIds.includes('addon-dominio') && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setFormState({ ...formState, domainExt: 'cl', customTotalInicialCLP: '' })}
                      style={{
                        background: formState.domainExt === 'cl' ? '#7c3aed' : '#1e293b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Dominio .cl ($14.990/año)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormState({ ...formState, domainExt: 'com', customTotalInicialCLP: '' })}
                      style={{
                        background: formState.domainExt === 'com' ? '#7c3aed' : '#1e293b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Dominio .com ($22.990/año)
                    </button>
                  </div>
                )}
              </div>

              {/* Montos, Cuotas y Fechas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Cuota Mensual (CLP)
                  </label>
                  <input
                    type="number"
                    value={
                      formState.customMonthlyCLP !== ''
                        ? formState.customMonthlyCLP
                        : suggestedMonthlyCLP
                    }
                    onChange={(e) => setFormState({ ...formState, customMonthlyCLP: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: '#1e293b',
                      color: '#4ade80',
                      fontWeight: 800,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Monto Inicial Pagado (CLP)
                  </label>
                  <input
                    type="number"
                    value={
                      formState.customTotalInicialCLP !== ''
                        ? formState.customTotalInicialCLP
                        : suggestedInitialTotalCLP
                    }
                    onChange={(e) =>
                      setFormState({ ...formState, customTotalInicialCLP: e.target.value })
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: '#1e293b',
                      color: '#fff',
                      fontWeight: 800,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Cuántas Cuotas Lleva Pagadas
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formState.cuotasPagadas}
                    onChange={(e) => setFormState({ ...formState, cuotasPagadas: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: '#1e293b',
                      color: '#38bdf8',
                      fontWeight: 800,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={formState.fechaInicio}
                    onChange={(e) => setFormState({ ...formState, fechaInicio: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: '#1e293b',
                      color: '#fff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Cuándo Tiene que Pagar (Próximo Cobro)
                  </label>
                  <input
                    type="date"
                    value={formState.proximoCobro}
                    onChange={(e) => setFormState({ ...formState, proximoCobro: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.18)',
                      background: '#1e293b',
                      color: '#fff',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                    Método de Pago y Estado
                  </label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <select
                      value={formState.metodoPago}
                      onChange={(e) => setFormState({ ...formState, metodoPago: e.target.value })}
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: '#1e293b',
                        color: '#fff',
                      }}
                    >
                      <option value="transferencia">Transferencia</option>
                      <option value="mercadopago">Mercado Pago</option>
                    </select>
                    <select
                      value={formState.estadoSuscripcion}
                      onChange={(e) =>
                        setFormState({ ...formState, estadoSuscripcion: e.target.value })
                      }
                      style={{
                        flex: 1,
                        padding: '10px 8px',
                        borderRadius: 10,
                        border: '1px solid rgba(255,255,255,0.18)',
                        background: '#1e293b',
                        color: '#fff',
                      }}
                    >
                      <option value="activa">Activa</option>
                      <option value="pendiente_confirmacion">Pendiente Confirmar</option>
                      <option value="pausada">Pausada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                  Notas Internas (Accesos, detalles del proyecto, banco, etc.)
                </label>
                <input
                  type="text"
                  value={formState.notasAdmin}
                  onChange={(e) => setFormState({ ...formState, notasAdmin: e.target.value })}
                  placeholder="Ej: Pagó por transferencia a BancoEstado, incluye correo contacto@..."
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.18)',
                    background: '#1e293b',
                    color: '#fff',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#cbd5e1',
                    borderRadius: 10,
                    padding: '11px 18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingForm}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a 0%, #059669 100%)',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: 10,
                    padding: '11px 22px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {savingForm ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Guardar Suscripción Web'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

