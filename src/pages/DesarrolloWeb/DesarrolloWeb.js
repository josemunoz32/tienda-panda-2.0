import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { auth } from '../../firebase';
import { db } from '../../firebaseDb';
import { storage } from '../../firebaseServices';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import {
  DEFAULT_PAYMENT_SETTINGS,
  normalizePaymentSettings,
  PAYMENT_SETTINGS_DOC,
  validatePaymentProofFile,
  visibleBankAccounts,
} from '../../utils/paymentMethods';

import miIcono from '../../assets/logos/miicono.png';
import logoWsp from '../../assets/logos/logowsp.png';
import logoIg from '../../assets/logos/logoig.png';
import footerBackground from '../../assets/footer/pandastore-footer-gaming.png';
import DarkVeil from '../../components/DarkVeil/DarkVeil';

// Portafolio: Imágenes reales de proyectos en src/assets/paginas desarrollo
import imgDavital from '../../assets/paginas desarrollo/httpsdavitalnutrition.cl.webp';
import imgPandaStore from '../../assets/paginas desarrollo/pandastoregaming.cl.png';
import imgReservaGo from '../../assets/paginas desarrollo/reservago.cl.webp';
import imgSinLink from '../../assets/paginas desarrollo/sin link.webp';
import imgVitaNacion from '../../assets/paginas desarrollo/vitanacion.cl.webp';

import '../../pages/Footer/Footer.css';
import './DesarrolloWeb.css';

const WEB_CART_STORAGE_KEY = 'pandastore_webdev_cart_v1';

const formatCLP = (amount) => {
  const num = Math.round(Number(amount || 0));
  return `$${num.toLocaleString('es-CL')}`;
};

// Suma 1 mes a una fecha ISO
const addOneMonthISO = (fromDate = new Date()) => {
  const d = new Date(fromDate);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
};

// ══ ÍCONOS VECTORIALES SVG 100% MINIMALISTAS Y MORADOS ═══════════════
const PurpleIcon = ({ name, size = 22 }) => {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: '#a259ff',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  switch (name) {
    case 'zap':
      return (
        <svg {...props}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'smartphone':
      return (
        <svg {...props}>
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'check-circle':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'headphones':
      return (
        <svg {...props}>
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      );
    case 'layout':
      return (
        <svg {...props}>
          <rect width="7" height="7" x="3" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="3" rx="1" />
          <rect width="7" height="7" x="14" y="14" rx="1" />
          <rect width="7" height="7" x="3" y="14" rx="1" />
        </svg>
      );
    case 'rocket':
      return (
        <svg {...props}>
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        </svg>
      );
    case 'bot':
      return (
        <svg {...props}>
          <rect width="18" height="10" x="3" y="11" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8.01" y2="16" />
          <line x1="16" y1="16" x2="16.01" y2="16" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...props}>
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...props}>
          <rect width="20" height="16" x="2" y="4" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
};

// ══ PLANES POR CATEGORÍA (BÁSICA • INTERMEDIA • PRO) ══════════════════
export const PLAN_CATEGORIES = {
  landing: {
    label: 'Landing Pages',
    sublabel: 'Para negocios, servicios y profesionales',
    plans: [
      {
        id: 'landing-basica',
        categoryKey: 'landing',
        tier: 'NIVEL 1 • BÁSICA',
        name: 'Landing Básica',
        priceCLP: 14990,
        price: '$14.990',
        period: '/ mes',
        billingType: 'monthly',
        badge: 'Inicial',
        featured: false,
        accent: 'default',
        idealFor: 'Presencia profesional rápida para empezar a captar clientes.',
        highlights: [
          'Diseño moderno adaptable a celular (hasta 4 secciones)',
          'Botón directo a WhatsApp y redes sociales',
          'Información del negocio y formulario de contacto',
          'SEO básico para aparecer en Google',
          'Hosting rápido + Certificado SSL incluido',
          'Soporte técnico incluido (1 ajuste mensual)',
        ],
      },
      {
        id: 'landing-intermedia',
        categoryKey: 'landing',
        tier: 'NIVEL 2 • INTERMEDIA',
        name: 'Landing Intermedia',
        priceCLP: 24990,
        price: '$24.990',
        period: '/ mes',
        billingType: 'monthly',
        badge: 'Más Popular',
        featured: true,
        accent: 'popular',
        idealFor: 'Más secciones, galería visual y medición para vender más.',
        highlights: [
          'Todo lo del Plan Básico + Hasta 7 secciones',
          'Galería de fotos/trabajos y mapa Google Maps',
          'Animaciones fluidas y formularios avanzados',
          'Testimonios, preguntas frecuentes y llamado a la acción',
          'SEO optimizado + Google Analytics y Meta Pixel',
          'Soporte técnico incluido (2 ajustes mensuales)',
        ],
      },
      {
        id: 'landing-pro',
        categoryKey: 'landing',
        tier: 'NIVEL 3 • PRO',
        name: 'Landing Pro',
        priceCLP: 39990,
        price: '$39.990',
        period: '/ mes',
        billingType: 'monthly',
        badge: 'Avanzada',
        featured: false,
        accent: 'pro',
        idealFor: 'Diseño premium a medida, alto impacto y máxima conversión.',
        highlights: [
          'Todo lo del Plan Intermedio + Hasta 10 secciones a medida',
          'Catálogo interactivo de servicios o portafolio avanzado',
          'Integraciones con píxeles publicitarios y CRM WhatsApp',
          'Optimización extrema de velocidad NVMe y respaldos semanales',
          'Redacción comercial persuasiva enfocada en ventas',
          'Soporte técnico prioritario VIP (4 ajustes/mes)',
        ],
      },
    ],
  },
  ecommerce: {
    label: 'Tiendas E-Commerce',
    sublabel: 'Con carrito de compras y pagos online',
    plans: [
      {
        id: 'ecommerce-basico',
        categoryKey: 'ecommerce',
        tier: 'NIVEL 1 • BÁSICA',
        name: 'E-commerce Básico',
        priceCLP: 34990,
        price: '$34.990',
        period: '/ mes',
        billingType: 'monthly',
        badge: 'Para Empezar',
        featured: false,
        accent: 'default',
        idealFor: 'Tu tienda online lista para vender con pagos automáticos.',
        highlights: [
          'Tienda online adaptable a celular (hasta 50 productos)',
          'Carrito de compras, categorías y control de stock',
          'Pagos con WebPay Plus, Mercado Pago y transferencia',
          'Panel autoadministrable de pedidos (0% comisión)',
          'Hosting rápido + Certificado SSL incluido',
          'Soporte técnico incluido (2 ajustes mensuales)',
        ],
      },
      {
        id: 'ecommerce-intermedio',
        categoryKey: 'ecommerce',
        tier: 'NIVEL 2 • INTERMEDIA',
        name: 'E-commerce Intermedio',
        priceCLP: 49990,
        price: '$49.990',
        period: '/ mes',
        billingType: 'monthly',
        badge: 'Más Popular',
        featured: true,
        accent: 'popular',
        idealFor: 'Para tiendas en crecimiento que buscan envíos y marketing.',
        highlights: [
          'Todo lo del E-commerce Básico + Hasta 200 productos',
          'Cálculo de envíos y despacho a todo Chile',
          'Cupones de descuento, ofertas y variantes (tallas/colores)',
          'SEO para productos + Google Analytics y Meta Pixel',
          'Capacitación en video para administrar tu tienda',
          'Soporte técnico incluido (3 ajustes mensuales)',
        ],
      },
      {
        id: 'ecommerce-pro',
        categoryKey: 'ecommerce',
        tier: 'NIVEL 3 • PRO',
        name: 'E-commerce Pro',
        priceCLP: 79990,
        price: '$79.990',
        period: '/ mes',
        billingType: 'monthly',
        badge: 'Full Comercio',
        featured: false,
        accent: 'pro',
        idealFor: 'Catálogo ilimitado, alto tráfico y automatización comercial.',
        highlights: [
          'Todo lo del Intermedio + Productos y categorías ilimitadas',
          'Recuperación automática de carritos abandonados',
          'Panel administrativo completo multi-usuario y reportes',
          'Herramientas de marketing, popups, packs y venta cruzada',
          'Servidor Cloud NVMe dedicado con respaldos diarios',
          'Soporte técnico prioritario VIP (5 ajustes/mes)',
        ],
      },
    ],
  },
};

export const ALL_PLANS_LIST = [
  ...PLAN_CATEGORIES.landing.plans,
  ...PLAN_CATEGORIES.ecommerce.plans,
];

// ══ EXTRAS / ADD-ONS OPCIONALES (VALORES REALES DE MERCADO EN CHILE) ═══
export const EXTRA_ADDONS = [
  {
    id: 'addon-chatbot',
    icon: 'bot',
    title: 'Chatbot IA Vendedor 24/7',
    shortTitle: 'Chatbot IA 24/7',
    priceCLP: 34990,
    price: '+$34.990 / mes',
    periodLabel: 'Mensual',
    billingType: 'monthly',
    includedIn: 'IA Entrenada a Medida',
    desc: 'Entrenado con tus servicios y catálogo: responde clientes 24/7 en lenguaje natural y deriva ventas listas a WhatsApp.',
  },
  {
    id: 'addon-agenda',
    icon: 'calendar',
    title: 'Sistema de Agenda y Reservas',
    shortTitle: 'Agenda y Reservas',
    priceCLP: 19990,
    price: '+$19.990 / mes',
    periodLabel: 'Mensual',
    billingType: 'monthly',
    includedIn: 'Citas Automatizadas',
    desc: 'Tus clientes reservan horas o citas directo en tu web con bloqueo de agenda y avisos automáticos.',
  },
  {
    id: 'addon-correos',
    icon: 'mail',
    title: 'Correos Corporativos (@tuweb)',
    shortTitle: 'Correos Corporativos (x5)',
    priceCLP: 9990,
    price: '+$9.990 / mes',
    periodLabel: 'Mensual',
    billingType: 'monthly',
    includedIn: 'Hasta 5 Casillas Pro',
    desc: 'Cuentas de correo profesionales (contacto@tunegocio.cl) configuradas listas para usar en tu celular y PC.',
  },
  {
    id: 'addon-dominio',
    icon: 'shield',
    title: 'Dominio Oficial (.cl o .com)',
    shortTitle: 'Dominio Oficial 1 Año',
    isDomainSelector: true,
    domainOptions: {
      cl: {
        ext: 'cl',
        label: 'Dominio .cl (NIC Chile)',
        priceCLP: 14990,
        priceFormatted: '$14.990 / año',
      },
      com: {
        ext: 'com',
        label: 'Dominio .com (Internacional)',
        priceCLP: 22990,
        priceFormatted: '$22.990 / año',
      },
    },
    priceCLP: 14990,
    price: '.cl $14.990 | .com $22.990',
    periodLabel: 'Pago Anual (1 Año)',
    billingType: 'annual',
    includedIn: 'Pago Anual (1 Año)',
    desc: 'Inscripción oficial por 1 año a tu nombre + configuración DNS completa (.cl en NIC Chile o .com internacional).',
  },
];

export default function DesarrolloWeb() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('landing');

  // ══ ESTADO DEL CARRITO EXCLUSIVO DE DESARROLLO WEB (SIN DUPLICADOS) ══
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);
  const [selectedDomainExt, setSelectedDomainExt] = useState('cl');
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // ══ ESTADO DE CHECKOUT (TARJETA, TRANSFERENCIA Y WHATSAPP EN CLP) ════
  const [user, setUser] = useState(auth.currentUser);
  const [userProfile, setUserProfile] = useState({});
  const [paymentSettings, setPaymentSettings] = useState(DEFAULT_PAYMENT_SETTINGS);
  const [metodoPagoWeb, setMetodoPagoWeb] = useState('mercadopago'); // 'mercadopago' | 'transferencia'
  const [bancoSeleccionado, setBancoSeleccionado] = useState(null);
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [completedOrder, setCompletedOrder] = useState(null);

  // Datos del cliente en el checkout web
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientProjectDomain, setClientProjectDomain] = useState('');

  const WHATSAPP_PHONE = '56974751810';
  const buildWhatsAppLink = (message) => {
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
  };

  // Cargar carrito web guardado en localStorage al iniciar
  useEffect(() => {
    window.scrollTo(0, 0);
    try {
      const saved = localStorage.getItem(WEB_CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedPlanId && ALL_PLANS_LIST.some((p) => p.id === parsed.selectedPlanId)) {
          setSelectedPlanId(parsed.selectedPlanId);
        }
        if (Array.isArray(parsed.selectedAddonIds)) {
          const validIds = Array.from(
            new Set(
              parsed.selectedAddonIds.filter((id) => EXTRA_ADDONS.some((a) => a.id === id))
            )
          );
          setSelectedAddonIds(validIds);
        }
        if (parsed.selectedDomainExt === 'cl' || parsed.selectedDomainExt === 'com') {
          setSelectedDomainExt(parsed.selectedDomainExt);
        }
      }
    } catch (e) {}
  }, []);

  // Persistir carrito web sin duplicados en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        WEB_CART_STORAGE_KEY,
        JSON.stringify({
          selectedPlanId,
          selectedAddonIds: Array.from(new Set(selectedAddonIds)),
          selectedDomainExt,
        })
      );
    } catch (e) {}
  }, [selectedPlanId, selectedAddonIds, selectedDomainExt]);

  // Escuchar sesión de usuario y métodos de pago desde Firestore
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        if (!clientEmail && u.email) setClientEmail(u.email);
        if (!clientName && u.displayName) setClientName(u.displayName);
        getDoc(doc(db, 'users', u.uid))
          .then((snap) => {
            if (snap.exists()) {
              const d = snap.data();
              setUserProfile(d);
              const fullName = `${d.firstName || ''} ${d.lastName || ''}`.trim();
              if (fullName) setClientName((prev) => prev || fullName);
            }
          })
          .catch(() => {});
      }
    });

    const unsubPay = onSnapshot(
      doc(db, ...PAYMENT_SETTINGS_DOC),
      (snap) => {
        setPaymentSettings(normalizePaymentSettings(snap.exists() ? snap.data() : {}));
      },
      () => {}
    );

    return () => {
      unsubAuth();
      unsubPay();
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = setTimeout(() => setToastMessage(null), 1800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // ══ UN SOLO BOTÓN POR PLAN Y POR EXTRA: AGREGAR O QUITAR DEL CARRITO ══
  const handleTogglePlan = (plan) => {
    setCompletedOrder(null);
    setCheckoutError('');
    if (selectedPlanId === plan.id) {
      setSelectedPlanId(null);
      showToast('Se quitó del carrito');
      return;
    }
    setSelectedPlanId(plan.id);
    showToast('✓ Se agregó al carrito');
  };

  const handleToggleAddon = (addonId) => {
    setCompletedOrder(null);
    setCheckoutError('');
    setSelectedAddonIds((prev) => {
      const exists = prev.includes(addonId);
      if (exists) {
        showToast('Se quitó del carrito');
        return prev.filter((id) => id !== addonId);
      }
      showToast('✓ Se agregó al carrito');
      return Array.from(new Set([...prev, addonId]));
    });
  };

  const handleSelectDomainExt = (ext) => {
    setSelectedDomainExt(ext);
    if (selectedAddonIds.includes('addon-dominio')) {
      showToast(`✓ Dominio cambiado a .${ext}`);
    }
  };

  const handleClearWebCart = () => {
    setSelectedPlanId(null);
    setSelectedAddonIds([]);
    setCheckoutError('');
    setCompletedOrder(null);
  };

  // Construcción de ítems únicos del carrito web y cálculos en CLP
  const selectedPlanObj = useMemo(
    () => ALL_PLANS_LIST.find((p) => p.id === selectedPlanId) || null,
    [selectedPlanId]
  );

  const selectedAddonsList = useMemo(() => {
    const uniqueIds = Array.from(new Set(selectedAddonIds));
    return uniqueIds
      .map((id) => {
        const base = EXTRA_ADDONS.find((a) => a.id === id);
        if (!base) return null;
        if (base.isDomainSelector) {
          const domOpt = base.domainOptions[selectedDomainExt] || base.domainOptions.cl;
          return {
            ...base,
            resolvedId: `addon-dominio-${domOpt.ext}`,
            resolvedTitle: domOpt.label,
            priceCLP: domOpt.priceCLP,
            priceFormatted: domOpt.priceFormatted,
          };
        }
        return {
          ...base,
          resolvedId: base.id,
          resolvedTitle: base.title,
          priceFormatted: `${formatCLP(base.priceCLP)} / mes`,
        };
      })
      .filter(Boolean);
  }, [selectedAddonIds, selectedDomainExt]);

  const cartItems = useMemo(() => {
    const items = [];
    if (selectedPlanObj) {
      items.push({
        id: selectedPlanObj.id,
        type: 'plan',
        name: `Plan ${selectedPlanObj.name}`,
        subtitle: `${selectedPlanObj.tier} • Suscripción Mensual`,
        priceCLP: selectedPlanObj.priceCLP,
        billingType: 'monthly',
        periodBadge: 'Mensual',
      });
    }
    selectedAddonsList.forEach((addon) => {
      items.push({
        id: addon.id,
        resolvedId: addon.resolvedId,
        type: 'addon',
        name: addon.resolvedTitle,
        subtitle: addon.includedIn,
        priceCLP: addon.priceCLP,
        billingType: addon.billingType,
        periodBadge: addon.billingType === 'annual' ? 'Anual (1 Año)' : 'Mensual',
      });
    });
    return items;
  }, [selectedPlanObj, selectedAddonsList]);

  const monthlyRecurringCLP = useMemo(
    () =>
      cartItems
        .filter((item) => item.billingType === 'monthly')
        .reduce((sum, item) => sum + Number(item.priceCLP || 0), 0),
    [cartItems]
  );

  const annualDomainCLP = useMemo(
    () =>
      cartItems
        .filter((item) => item.billingType === 'annual')
        .reduce((sum, item) => sum + Number(item.priceCLP || 0), 0),
    [cartItems]
  );

  const totalPayTodayCLP = useMemo(
    () => monthlyRecurringCLP + annualDomainCLP,
    [monthlyRecurringCLP, annualDomainCLP]
  );

  const bancosOficiales = useMemo(() => {
    return visibleBankAccounts(paymentSettings, userProfile).map((account) => ({
      id: account.id,
      nombre: account.name,
      logo: account.logo,
      color: account.color || '#a259ff',
      bg: `${account.color || '#a259ff'}22`,
      datos: `Titular: ${account.holder}\nRUT: ${account.rut}\nTipo de cuenta: ${account.type}\nN° Cuenta: ${account.number}\nEmail: ${account.email}`,
    }));
  }, [paymentSettings, userProfile]);

  useEffect(() => {
    if (!bancoSeleccionado && bancosOficiales.length > 0) {
      setBancoSeleccionado(bancosOficiales[0].id);
    }
  }, [bancosOficiales, bancoSeleccionado]);

  // Metadata completa de suscripción web para guardar en Firestore / Admin
  const buildWebSubscriptionMeta = (initialCuotas = 1, estadoSuscripcion = 'activa') => {
    const todayStr = new Date().toISOString().split('T')[0];
    const nextDueStr = addOneMonthISO(new Date());
    return {
      tipoServicio: 'desarrollo_web',
      estadoSuscripcion,
      planId: selectedPlanObj?.id || null,
      planName: selectedPlanObj?.name || 'Solo Extras',
      planPriceCLP: selectedPlanObj?.priceCLP || 0,
      extras: selectedAddonsList.map((a) => ({
        id: a.resolvedId || a.id,
        name: a.resolvedTitle,
        priceCLP: a.priceCLP,
        billingType: a.billingType,
      })),
      monthlyRecurringCLP,
      annualDomainCLP,
      totalInicialCLP: totalPayTodayCLP,
      totalRecaudadoCLP: initialCuotas > 0 ? totalPayTodayCLP : 0,
      cuotasPagadas: initialCuotas,
      fechaInicio: todayStr,
      proximoCobro: nextDueStr,
      proyectoDominio: clientProjectDomain.trim() || '',
      nombreCliente: clientName.trim() || '',
      emailCliente: clientEmail.trim() || '',
      phone: clientPhone.trim() || '',
      historialPagos:
        initialCuotas > 0
          ? [
              {
                cuotaNumero: 1,
                montoCLP: totalPayTodayCLP,
                fecha: new Date().toISOString(),
                nota: 'Pago inicial de suscripción',
              },
            ]
          : [],
    };
  };

  // Mensaje dinámico de WhatsApp con el resumen exacto del carrito en CLP
  const buildCartWhatsAppMessage = (orderIdRef = null) => {
    if (cartItems.length === 0) {
      return '¡Hola PandaStore! Quiero consultar por un plan mensual de Desarrollo Web.';
    }
    const lines = [
      orderIdRef
        ? `¡Hola PandaStore! Acabo de registrar mi pedido web #${orderIdRef}:`
        : '¡Hola PandaStore! Quiero contratar este paquete de Desarrollo Web:',
      '',
    ];
    cartItems.forEach((item) => {
      lines.push(
        `• ${item.name}: ${formatCLP(item.priceCLP)} CLP (${item.periodBadge})`
      );
    });
    lines.push('');
    lines.push(`💳 Cuota mensual: ${formatCLP(monthlyRecurringCLP)} CLP / mes`);
    if (annualDomainCLP > 0) {
      lines.push(`🌐 Dominio oficial (1 año): ${formatCLP(annualDomainCLP)} CLP`);
    }
    lines.push(`✅ TOTAL A PAGAR: ${formatCLP(totalPayTodayCLP)} CLP`);

    if (clientName.trim() || clientEmail.trim() || clientPhone.trim() || clientProjectDomain.trim()) {
      lines.push('');
      lines.push('📋 Mis datos:');
      if (clientName.trim()) lines.push(`- Nombre: ${clientName.trim()}`);
      if (clientEmail.trim()) lines.push(`- Correo: ${clientEmail.trim()}`);
      if (clientPhone.trim()) lines.push(`- Teléfono: ${clientPhone.trim()}`);
      if (clientProjectDomain.trim()) lines.push(`- Negocio / Dominio: ${clientProjectDomain.trim()}`);
    }
    return lines.join('\n');
  };

  // ══ ACCIÓN UNIFICADA DEL BOTÓN "PAGAR" ════════════════════════════════
  const handleUnifiedPay = async () => {
    if (metodoPagoWeb === 'mercadopago') {
      await handlePayWithMercadoPago();
    } else {
      await handlePayWithTransferencia();
    }
  };

  const handlePayWithMercadoPago = async () => {
    setCheckoutError('');
    if (cartItems.length === 0) {
      setCheckoutError('Agrega al menos un plan o servicio al carrito para continuar.');
      return;
    }
    if (!clientName.trim() || !clientEmail.trim() || !clientPhone.trim()) {
      setCheckoutError('Por favor completa tu nombre, correo electrónico y teléfono/WhatsApp.');
      return;
    }

    setProcesandoPago(true);
    try {
      const nameParts = clientName.trim().split(/\s+/);
      const firstName = nameParts[0] || clientName.trim();
      const lastName = nameParts.slice(1).join(' ') || 'Cliente Web';

      const mpCart = cartItems.map((item) => ({
        id: item.resolvedId || item.id,
        name: `${item.name}${clientProjectDomain.trim() ? ` (${clientProjectDomain.trim()})` : ''}`,
        description: `${item.subtitle} - Desarrollo Web PandaStore`,
        category_id: 'desarrollo_web',
        categoryId: 'desarrollo_web',
        categoryName: 'Desarrollo Web',
        plataforma: 'Desarrollo Web',
        billingType: item.billingType,
        quantity: 1,
        cantidad: 1,
        precio: Math.round(Number(item.priceCLP)),
      }));

      const webMeta = buildWebSubscriptionMeta(1, 'activa');

      const response = await fetch(
        'https://us-central1-pandastoreupdate.cloudfunctions.net/createMercadoPagoPreference',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cart: mpCart,
            email: clientEmail.trim(),
            uid: user?.uid || 'guest',
            total: Math.round(totalPayTodayCLP),
            firstName,
            lastName,
            shipping: webMeta,
          }),
        }
      );

      const data = await response.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        setCheckoutError(data.error || 'No se pudo iniciar el pago. Intenta nuevamente.');
        setProcesandoPago(false);
      }
    } catch (err) {
      setCheckoutError('Error al procesar el pago: ' + (err.message || err));
      setProcesandoPago(false);
    }
  };

  const handlePayWithTransferencia = async () => {
    setCheckoutError('');
    if (cartItems.length === 0) {
      setCheckoutError('Agrega al menos un plan o servicio al carrito para continuar.');
      return;
    }
    if (!clientName.trim() || !clientEmail.trim() || !clientPhone.trim()) {
      setCheckoutError('Por favor completa tu nombre, correo electrónico y teléfono/WhatsApp.');
      return;
    }
    if (!bancoSeleccionado) {
      setCheckoutError('Selecciona la cuenta bancaria a la que realizaste la transferencia.');
      return;
    }
    if (!comprobanteFile) {
      setCheckoutError('Adjunta el comprobante de tu transferencia bancaria (JPG, PNG o PDF).');
      return;
    }
    const fileErr = validatePaymentProofFile(comprobanteFile);
    if (fileErr) {
      setCheckoutError(fileErr);
      return;
    }

    setProcesandoPago(true);
    let comprobanteUrl = null;

    if (user?.uid) {
      try {
        const safeName = comprobanteFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const sRef = storageRef(storage, `comprobantes/${user.uid}/web_${Date.now()}_${safeName}`);
        await uploadBytes(sRef, comprobanteFile);
        comprobanteUrl = await getDownloadURL(sRef);
      } catch (uploadErr) {
        comprobanteUrl = null;
      }
    }

    try {
      const webMeta = buildWebSubscriptionMeta(0, 'pendiente_confirmacion');
      const bancoNombre =
        bancosOficiales.find((b) => b.id === bancoSeleccionado)?.nombre || bancoSeleccionado;

      const pedidoWeb = {
        tipoPedido: 'desarrollo_web',
        productos: cartItems.map((item) => ({
          id: item.resolvedId || item.id,
          name: item.name,
          cantidad: 1,
          precio: Math.round(Number(item.priceCLP)),
          description: `${item.subtitle}${clientProjectDomain.trim() ? ` • Proyecto: ${clientProjectDomain.trim()}` : ''}`,
          category_id: 'desarrollo_web',
          categoryId: 'desarrollo_web',
          categoryName: 'Desarrollo Web',
          plataforma: 'Desarrollo Web',
          billingType: item.billingType,
        })),
        subtotal: totalPayTodayCLP,
        subtotalCLP: totalPayTodayCLP,
        descuentoPorcentaje: 0,
        descuentoCuponMonto: 0,
        iva: 0,
        tasaIva: 0,
        total: totalPayTodayCLP,
        moneda: 'CLP',
        totalCLP: totalPayTodayCLP,
        totalLocal: totalPayTodayCLP,
        monedaLocal: 'CLP',
        monthlyRecurringCLP,
        annualDomainCLP,
        pais: 'CL',
        tasaUsada: 1,
        metodoPago: 'transferencia',
        transferenciaEstado: 'pendiente',
        estado: 'pendiente',
        banco: bancoNombre,
        comprobanteUrl: comprobanteUrl || null,
        comprobanteNombre: comprobanteFile?.name || null,
        email: clientEmail.trim(),
        nombre: clientName.trim(),
        phone: clientPhone.trim(),
        proyectoDominio: clientProjectDomain.trim() || null,
        fecha: new Date().toISOString(),
        uid: user?.uid || 'guest',
        isGuest: !user,
        shipping: {
          ...webMeta,
          banco: bancoNombre,
          comprobanteNombre: comprobanteFile?.name || null,
        },
      };

      const orderRef = await addDoc(collection(db, 'orders'), pedidoWeb);
      if (user?.uid) {
        await setDoc(doc(db, `users/${user.uid}/orders`, orderRef.id), {
          ...pedidoWeb,
          globalOrderId: orderRef.id,
        });
      }

      setCompletedOrder({
        orderId: orderRef.id,
        totalCLP: totalPayTodayCLP,
        monthlyRecurringCLP,
        annualDomainCLP,
        items: [...cartItems],
        banco: bancoNombre,
        wspMessage: buildCartWhatsAppMessage(orderRef.id),
      });

      setSelectedPlanId(null);
      setSelectedAddonIds([]);
      setComprobanteFile(null);
    } catch (err) {
      setCheckoutError('No se pudo registrar el pedido: ' + (err.message || err));
    } finally {
      setProcesandoPago(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const currentCategoryData = PLAN_CATEGORIES[activeCategory];

  const portfolioProjects = [
    {
      name: 'pandastoregaming.cl',
      category: 'E-Commerce Gamer & WebPay',
      image: imgPandaStore,
      url: 'https://pandastoregaming.cl',
      hasLink: true,
      highlight: true,
      badge: 'E-Commerce en Vivo',
    },
    {
      name: 'reservago.cl',
      category: 'Plataforma de Reservas & Citas',
      image: imgReservaGo,
      url: 'https://reservago.cl',
      hasLink: true,
      highlight: false,
      badge: 'Plataforma Web',
    },
    {
      name: 'vitanacion.cl',
      category: 'Tienda Online de Suplementos',
      image: imgVitaNacion,
      url: 'https://vitanacion.cl',
      hasLink: true,
      highlight: false,
      badge: 'E-Commerce en Vivo',
    },
    {
      name: 'davitalnutrition.cl',
      category: 'E-Commerce Nutrición Integral',
      image: imgDavital,
      url: 'https://davitalnutrition.cl',
      hasLink: true,
      highlight: false,
      badge: 'E-Commerce en Vivo',
    },
    {
      name: 'Catálogo Digital para Pymes',
      category: 'Catálogo Comercial & WhatsApp',
      image: imgSinLink,
      url: null,
      hasLink: false,
      highlight: false,
      badge: 'Desarrollo a Medida',
    },
  ];

  return (
    <div className="pdev-root">
      <Helmet>
        <title>Planes Mensuales de Páginas Web y E-Commerce en Chile | PandaStore</title>
        <meta
          name="description"
          content="Planes mensuales de Landing Pages y Tiendas Online E-Commerce desde $14.990/mes en Chile. Arma tu carrito con Chatbot IA, Correos y Dominio .cl o .com en CLP."
        />
        <link rel="canonical" href="https://pandastoregaming.cl/desarrollo-web" />
      </Helmet>

      {/* ══ AVISO BREVE QUE APARECE Y DESAPARECE SOLO ════════════════ */}
      {toastMessage && (
        <div className="pdev-cart-toast" role="status" aria-live="polite">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ══ HEADER FLOTANTE ESTILO ARC (ÚNICO CARRITO ARRIBA) ════════ */}
      <div className="pdev-floating-nav-wrapper">
        <header className="pdev-header-pill">
          <Link
            to="/desarrollo-web"
            className="pdev-brand"
            aria-label="PandaStore Desarrollo Web"
            onClick={() => {
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <div className="pdev-brand-logo-wrap">
              <img src={miIcono} alt="PandaStore Logo" className="pdev-brand-img" />
            </div>
            <span className="pdev-brand-title">PandaStore</span>
          </Link>

          <nav className="pdev-nav-desktop" aria-label="Navegación Desarrollo Web">
            <a
              href="#planes"
              className={`pdev-nav-pill ${activeCategory === 'landing' ? 'active' : ''}`}
              onClick={() => setActiveCategory('landing')}
            >
              Landing Pages
            </a>
            <a
              href="#planes"
              className={`pdev-nav-pill ${activeCategory === 'ecommerce' ? 'active' : ''}`}
              onClick={() => setActiveCategory('ecommerce')}
            >
              E-Commerce
            </a>
            <a href="#extras" className="pdev-nav-pill">
              Chatbot &amp; Extras
            </a>
            <a href="#soporte" className="pdev-nav-pill">
              Soporte
            </a>
            <a href="#portafolio" className="pdev-nav-pill">
              Portafolio
            </a>
          </nav>

          <div className="pdev-header-right">
            <button
              type="button"
              className={`pdev-header-cart-btn ${cartItems.length > 0 ? 'has-items' : ''}`}
              onClick={() => setCartDrawerOpen(true)}
              aria-label="Abrir carrito de desarrollo web"
            >
              <span className="pdev-header-cart-icon" aria-hidden="true">🛒</span>
              <span className="pdev-header-cart-label">
                {cartItems.length > 0 ? formatCLP(totalPayTodayCLP) : 'Carrito'}
              </span>
              <span className="pdev-header-cart-badge">{cartItems.length}</span>
            </button>

            <a
              href={buildWhatsAppLink(buildCartWhatsAppMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="pdev-btn-cta-arc"
            >
              <img src={logoWsp} alt="" className="pdev-btn-inline-wsp" />
              <span>WhatsApp</span>
            </a>

            <button
              type="button"
              className={`pdev-hamburger-btn ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menú de navegación"
              aria-expanded={mobileMenuOpen}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <nav className="pdev-mobile-drawer" aria-label="Menú móvil">
            <a
              href="#planes"
              className={`pdev-mobile-link ${activeCategory === 'landing' ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory('landing');
                setMobileMenuOpen(false);
              }}
            >
              <span>Planes Landing Page (Básica / Intermedia / Pro)</span>
              <span className="pdev-mobile-badge">Desde $14.990</span>
            </a>
            <a
              href="#planes"
              className={`pdev-mobile-link ${activeCategory === 'ecommerce' ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory('ecommerce');
                setMobileMenuOpen(false);
              }}
            >
              <span>Planes E-Commerce (Básico / Intermedio / Pro)</span>
              <span className="pdev-mobile-badge">Desde $34.990</span>
            </a>
            <a
              href="#extras"
              className="pdev-mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span>Chatbot IA, Correos y Dominios</span>
              <span className="pdev-mobile-badge">Extras</span>
            </a>
            <button
              type="button"
              className="pdev-mobile-link pdev-mobile-cart-trigger"
              onClick={() => {
                setMobileMenuOpen(false);
                setCartDrawerOpen(true);
              }}
            >
              <span>🛒 Abrir Carrito ({cartItems.length})</span>
              <span className="pdev-mobile-badge">{formatCLP(totalPayTodayCLP)} CLP</span>
            </button>
            <a
              href={buildWhatsAppLink(buildCartWhatsAppMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="pdev-mobile-cta"
              onClick={() => setMobileMenuOpen(false)}
            >
              <img src={logoWsp} alt="WhatsApp" className="pdev-btn-wsp-icon" />
              <span>Hablar por WhatsApp</span>
            </a>
          </nav>
        )}
      </div>

      {/* ══ SECCIÓN 1: HERO LIMPIO Y DIRECTO ══════════════════════════ */}
      <div
        className="pdev-hero-wrapper"
        id="hero"
        style={{ background: 'radial-gradient(circle at 50% 15%, #26104f 0%, #0b0518 52%, #070311 100%)' }}
      >
        <div className="pdev-veil-canvas-wrap" aria-hidden="true">
          <DarkVeil
            color="#7b2ff2"
            speed={0.5}
            flow={1}
            scale={1}
            warp={0.15}
            brightness={1}
            glow={0.5}
            grain={0.03}
            quality={0.5}
            mouseInteraction={true}
          />
        </div>

        <section className="pdev-hero">
          <div className="pdev-hero-badge-pill">
            <span className="pdev-hero-badge-dot" aria-hidden="true" />
            <span>SUSCRIPCIÓN MENSUAL • $0 COSTO DE INSTALACIÓN</span>
          </div>

          <h1 className="pdev-hero-title">
            Tu Página Web o Tienda Online desde $14.990 al mes
          </h1>

          <p className="pdev-hero-desc">
            Elige tu plan <strong>Básico, Intermedio o Pro</strong>, suma extras como <strong>Correos, Dominio o Chatbot IA</strong> y contrata online con <strong>soporte técnico continuo incluido</strong>.
          </p>

          <div className="pdev-hero-actions">
            <a href="#planes" className="pdev-btn-hero22-primary">
              <span>Ver Planes Mensuales</span>
            </a>
            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              className="pdev-btn-hero22-secondary"
            >
              <span>🛒 Ver Carrito ({cartItems.length})</span>
            </button>
          </div>
        </section>
      </div>

      {/* ══ SECCIÓN 2: CATEGORÍAS DE PLANES (LANDING VS E-COMMERCE) + EXTRAS ══ */}
      <section className="pdev-plan-light-section" id="planes">
        <div className="pdev-plans-container-light">
          <div className="pdev-plans-header-light">
            <span className="pdev-section-tag-light">Planes Mensuales Todo Incluido</span>
            <h2 className="pdev-section-title-light">
              Selecciona qué necesita tu negocio
            </h2>

            {/* Selector Principal de Categoría: Landing Pages vs E-Commerce */}
            <div className="pdev-category-switcher" role="tablist" aria-label="Tipo de sitio web">
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'landing'}
                className={`pdev-cat-switch-btn ${activeCategory === 'landing' ? 'active' : ''}`}
                onClick={() => setActiveCategory('landing')}
              >
                <span className="pdev-cat-switch-title">Landing Pages</span>
                <span className="pdev-cat-switch-sub">Páginas informativas y servicios • Desde $14.990/mes</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === 'ecommerce'}
                className={`pdev-cat-switch-btn ${activeCategory === 'ecommerce' ? 'active' : ''}`}
                onClick={() => setActiveCategory('ecommerce')}
              >
                <span className="pdev-cat-switch-title">Tiendas E-Commerce</span>
                <span className="pdev-cat-switch-sub">Catálogo, carrito y pagos WebPay • Desde $34.990/mes</span>
              </button>
            </div>
          </div>

          {/* Grilla Limpia de 3 Planes (1 solo botón que alterna Agregar / Quitar) */}
          <div className="pdev-plans-grid pdev-plans-grid--three">
            {currentCategoryData.plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;

              return (
                <article
                  key={plan.id}
                  className={`pdev-plan-card ${plan.featured ? 'pdev-plan-card--featured' : ''} ${
                    isSelected ? 'pdev-plan-card--selected' : ''
                  }`}
                >
                  {isSelected ? (
                    <div className="pdev-plan-popular-ribbon pdev-plan-popular-ribbon--selected">
                      ✓ EN TU CARRITO
                    </div>
                  ) : (
                    plan.featured && (
                      <div className="pdev-plan-popular-ribbon">
                        ★ MÁS ELEGIDO
                      </div>
                    )
                  )}

                  <div className="pdev-plan-card-top">
                    <div className="pdev-plan-step-row">
                      <span className="pdev-plan-step">{plan.tier}</span>
                      <span className={`pdev-plan-badge pdev-plan-badge--${plan.accent}`}>
                        {plan.badge}
                      </span>
                    </div>

                    <h3 className="pdev-plan-name">{plan.name}</h3>
                    <p className="pdev-plan-ideal">{plan.idealFor}</p>

                    <div className="pdev-plan-price-wrap">
                      <div className="pdev-plan-price-line">
                        <span className="pdev-plan-price-amount">{plan.price}</span>
                        <span className="pdev-plan-price-period">{plan.period}</span>
                      </div>
                      <span className="pdev-plan-zero-setup">
                        $0 instalación • Hosting + Soporte incluido
                      </span>
                    </div>
                  </div>

                  <div className="pdev-plan-card-divider" />

                  <ul className="pdev-plan-features-list">
                    {plan.highlights.map((item, iIdx) => {
                      const isHighlight =
                        item.toLowerCase().includes('soporte técnico') ||
                        item.toLowerCase().includes('chatbot ia');
                      return (
                        <li
                          key={iIdx}
                          className={`pdev-plan-feature-item ${
                            isHighlight ? 'pdev-plan-feature-item--highlight' : ''
                          }`}
                        >
                          <span className="pdev-plan-check-icon" aria-hidden="true">
                            ✓
                          </span>
                          <span>{item}</span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="pdev-plan-card-actions">
                    <button
                      type="button"
                      onClick={() => handleTogglePlan(plan)}
                      className={`pdev-plan-cta-btn ${
                        isSelected
                          ? 'pdev-plan-cta-btn--selected'
                          : plan.featured
                          ? 'pdev-plan-cta-btn--featured'
                          : ''
                      }`}
                    >
                      <span>{isSelected ? 'Quitar del carrito' : 'Agregar al carrito'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* ══ SECCIÓN DE EXTRAS (1 SOLO BOTÓN QUE ALTERNA AGREGAR / QUITAR) ══ */}
          <div className="pdev-extras-section" id="extras">
            <div className="pdev-extras-header">
              <span className="pdev-section-tag-light">Servicios Adicionales &amp; IA</span>
              <h3>Potencia tu web con módulos adicionales</h3>
              <p>
                Súmalos a tu carrito con un clic según lo que necesite tu negocio.
              </p>
            </div>

            <div className="pdev-extras-grid">
              {EXTRA_ADDONS.map((addon) => {
                const isAdded = selectedAddonIds.includes(addon.id);
                const activeDomOpt = addon.isDomainSelector
                  ? addon.domainOptions[selectedDomainExt]
                  : null;

                return (
                  <div
                    key={addon.id}
                    className={`pdev-extra-card ${isAdded ? 'pdev-extra-card--selected' : ''}`}
                  >
                    <div className="pdev-extra-top">
                      <div className="pdev-include-icon-light">
                        <PurpleIcon name={addon.icon} size={20} />
                      </div>
                      <div className="pdev-extra-price-col">
                        <span className="pdev-extra-price">
                          {addon.isDomainSelector ? activeDomOpt.priceFormatted : addon.price}
                        </span>
                        <span className="pdev-extra-included-badge">{addon.includedIn}</span>
                      </div>
                    </div>

                    <h4 className="pdev-extra-title">{addon.title}</h4>
                    <p className="pdev-extra-desc">{addon.desc}</p>

                    {addon.isDomainSelector && (
                      <div className="pdev-domain-ext-picker" role="group" aria-label="Elegir extensión de dominio">
                        <button
                          type="button"
                          className={`pdev-domain-ext-btn ${selectedDomainExt === 'cl' ? 'active' : ''}`}
                          onClick={() => handleSelectDomainExt('cl')}
                        >
                          <span>🇨🇱 .cl</span>
                          <strong>$14.990/año</strong>
                        </button>
                        <button
                          type="button"
                          className={`pdev-domain-ext-btn ${selectedDomainExt === 'com' ? 'active' : ''}`}
                          onClick={() => handleSelectDomainExt('com')}
                        >
                          <span>🌎 .com</span>
                          <strong>$22.990/año</strong>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleAddon(addon.id)}
                      className={`pdev-extra-cart-btn ${isAdded ? 'added' : ''}`}
                    >
                      {isAdded ? 'Quitar del carrito' : 'Agregar al carrito'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ══ BLOQUE COMPACTO DE SOPORTE TÉCNICO INCLUIDO (3 PUNTOS CORTOS) ══ */}
          <div className="pdev-support-differentiator-card" id="soporte">
            <div className="pdev-support-diff-header">
              <span className="pdev-support-diff-pill">NUESTRO DIFERENCIADOR</span>
              <h3>Soporte Técnico Incluido en Todos los Planes</h3>
              <p>
                No pagas aparte por errores o asistencia. Mientras tu suscripción esté activa, nuestro equipo cuida tu página:
              </p>
            </div>

            <div className="pdev-support-scopes-grid">
              <div className="pdev-support-scope-box">
                <div className="pdev-support-scope-top">
                  <div className="pdev-include-icon-light">
                    <PurpleIcon name="headphones" size={20} />
                  </div>
                  <span className="pdev-scope-status-tag pdev-scope-status-tag--free">
                    100% Incluido
                  </span>
                </div>
                <h4>Errores y Funcionamiento</h4>
                <p>
                  Resolvemos sin costo cualquier caída, error visual, problema de formulario, SSL o pasarela de pago.
                </p>
              </div>

              <div className="pdev-support-scope-box">
                <div className="pdev-support-scope-top">
                  <div className="pdev-include-icon-light">
                    <PurpleIcon name="layout" size={20} />
                  </div>
                  <span className="pdev-scope-status-tag pdev-scope-status-tag--monthly">
                    Incluido Mes a Mes
                  </span>
                </div>
                <h4>Cambios Mensuales</h4>
                <p>
                  Actualizamos textos, fotos, precios o banners promocionales por ti todos los meses según tu plan.
                </p>
              </div>

              <div className="pdev-support-scope-box">
                <div className="pdev-support-scope-top">
                  <div className="pdev-include-icon-light">
                    <PurpleIcon name="rocket" size={20} />
                  </div>
                  <span className="pdev-scope-status-tag pdev-scope-status-tag--custom">
                    Sin Amarras
                  </span>
                </div>
                <h4>Escala Cuando Quieras</h4>
                <p>
                  Empieza en un plan Básico y sube a Intermedio, Pro o E-Commerce en cualquier momento según crezca tu negocio.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECCIÓN 3: ¿POR QUÉ NOSOTROS? (FONDO OSCURO CON DARKVEIL) ═══ */}
      <section
        className="pdev-features5-section"
        id="beneficios"
        style={{ background: 'radial-gradient(circle at 50% 20%, #201044 0%, #0b0518 55%, #070311 100%)' }}
      >
        <div className="pdev-veil-canvas-wrap" aria-hidden="true">
          <DarkVeil
            color="#6b12ff"
            speed={0.4}
            flow={0.9}
            scale={1.1}
            warp={0.15}
            brightness={1}
            glow={0.45}
            grain={0.03}
            quality={0.5}
            mouseInteraction={true}
          />
        </div>

        <div className="pdev-features5-head">
          <span className="pdev-features5-tag">Ventajas</span>
          <h2 className="pdev-features5-title">Todo resuelto en una sola suscripción</h2>
          <p className="pdev-features5-desc">
            Diseño, alojamiento, seguridad y soporte técnico en un solo lugar.
          </p>
        </div>

        <div className="pdev-features5-grid">
          <div className="pdev-features5-item">
            <div className="pdev-features5-icon">
              <PurpleIcon name="headphones" size={32} />
            </div>
            <h3 className="pdev-features5-item-title">Soporte por WhatsApp</h3>
            <p className="pdev-features5-item-desc">
              Atención directa en Chile incluida mes a mes sin cobros sorpresa.
            </p>
          </div>

          <div className="pdev-features5-item">
            <div className="pdev-features5-icon">
              <PurpleIcon name="check-circle" size={32} />
            </div>
            <h3 className="pdev-features5-item-title">Sin Inversión Inicial</h3>
            <p className="pdev-features5-item-desc">
              Parte desde $14.990/mes sin desembolsar cientos de miles de pesos de golpe.
            </p>
          </div>

          <div className="pdev-features5-item">
            <div className="pdev-features5-icon">
              <PurpleIcon name="zap" size={32} />
            </div>
            <h3 className="pdev-features5-item-title">Hosting Rápido Incluido</h3>
            <p className="pdev-features5-item-desc">
              Servidores de alta velocidad para que tu página cargue al instante.
            </p>
          </div>

          <div className="pdev-features5-item">
            <div className="pdev-features5-icon">
              <PurpleIcon name="smartphone" size={32} />
            </div>
            <h3 className="pdev-features5-item-title">100% Adaptado a Celular</h3>
            <p className="pdev-features5-item-desc">
              Diseño impecable en smartphones, tablets y computadores.
            </p>
          </div>

          <div className="pdev-features5-item">
            <div className="pdev-features5-icon">
              <PurpleIcon name="shield" size={32} />
            </div>
            <h3 className="pdev-features5-item-title">Seguridad SSL y Backups</h3>
            <p className="pdev-features5-item-desc">
              Candado HTTPS seguro y copias de respaldo automáticas incluidas.
            </p>
          </div>

          <div className="pdev-features5-item">
            <div className="pdev-features5-icon">
              <PurpleIcon name="bot" size={32} />
            </div>
            <h3 className="pdev-features5-item-title">Chatbot IA &amp; Automatización</h3>
            <p className="pdev-features5-item-desc">
              Atiende consultas 24/7, agenda citas y recupera ventas en automático.
            </p>
          </div>
        </div>
      </section>

      {/* ══ SECCIÓN 4: PORTAFOLIO DE PROYECTOS (FONDO BLANCO) ═══════════ */}
      <section className="pdev-portfolio-light-section" id="portafolio">
        <div className="pdev-portfolio-head-light">
          <span className="pdev-portfolio-tag-light">Portafolio</span>
          <h2 className="pdev-portfolio-title-light">Proyectos desarrollados para nuestros clientes</h2>
          <p className="pdev-portfolio-desc-light">
            Sitios web, plataformas de reserva y tiendas online funcionando en vivo.
          </p>
        </div>

        <div className="pdev-portfolio-grid">
          {portfolioProjects.map((project, idx) => (
            <div
              key={idx}
              className={`pdev-studio-card ${project.highlight ? 'highlight' : ''}`}
            >
              <div className="pdev-card-glow-aura" aria-hidden="true" />

              <div className="pdev-card-img-wrap">
                <span className="pdev-card-badge">{project.badge}</span>
                <img
                  src={project.image}
                  alt={`Proyecto ${project.name}`}
                  className="pdev-card-img"
                  loading="lazy"
                />
              </div>

              <div className="pdev-card-body">
                <div className="pdev-card-footer">
                  <div className="pdev-card-title-col">
                    <span className="pdev-card-category">{project.category}</span>
                    <h4 className="pdev-card-title">{project.name}</h4>
                  </div>

                  {project.hasLink ? (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pdev-card-arrow-btn"
                      aria-label={`Ver proyecto en vivo ${project.name}`}
                      title={`Visitar ${project.name}`}
                    >
                      →
                    </a>
                  ) : (
                    <span className="pdev-card-no-link-badge">A Medida</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ DRAWER / MODAL DE CARRITO Y CHECKOUT DE DESARROLLO WEB (CLP) ══ */}
      {cartDrawerOpen && (
        <div
          className="pdev-cart-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCartDrawerOpen(false);
          }}
        >
          <aside className="pdev-cart-drawer" aria-label="Carrito de Desarrollo Web">
            <div className="pdev-cart-drawer-header">
              <div>
                <span className="pdev-cart-drawer-tag">CARRITO DESARROLLO WEB • CLP</span>
                <h3>Resumen de tu Suscripción</h3>
              </div>
              <button
                type="button"
                className="pdev-cart-close-btn"
                onClick={() => setCartDrawerOpen(false)}
                aria-label="Cerrar carrito"
              >
                ✕
              </button>
            </div>

            <div className="pdev-cart-drawer-body">
              {completedOrder ? (
                <div className="pdev-order-success-box">
                  <div className="pdev-order-success-icon">✅</div>
                  <h4>¡Solicitud Registrada!</h4>
                  <p>
                    Código de orden: <strong>#{completedOrder.orderId}</strong>
                  </p>
                  <div className="pdev-order-success-summary">
                    {completedOrder.items.map((it) => (
                      <div key={it.id} className="pdev-order-success-row">
                        <span>{it.name}</span>
                        <strong>{formatCLP(it.priceCLP)} CLP</strong>
                      </div>
                    ))}
                    <div className="pdev-order-success-total">
                      <span>Monto en revisión ({completedOrder.banco}):</span>
                      <strong>{formatCLP(completedOrder.totalCLP)} CLP</strong>
                    </div>
                  </div>
                  <p className="pdev-order-success-note">
                    Tu pago por transferencia quedó pendiente de confirmación manual. También puedes avisarnos por WhatsApp para activarlo de inmediato:
                  </p>
                  <a
                    href={buildWhatsAppLink(completedOrder.wspMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pdev-checkout-wsp-main-btn"
                  >
                    <img src={logoWsp} alt="" className="pdev-btn-inline-wsp" />
                    <span>Enviar por WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    className="pdev-order-reset-btn"
                    onClick={() => {
                      setCompletedOrder(null);
                      setCartDrawerOpen(false);
                    }}
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <>
                  {/* 1. LISTA DE ÍTEMS DEL CARRITO SIN DUPLICADOS */}
                  <div className="pdev-cart-section">
                    <div className="pdev-cart-section-head">
                      <h4>1. Tu selección ({cartItems.length})</h4>
                      {cartItems.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearWebCart}
                          className="pdev-cart-clear-link"
                        >
                          Vaciar
                        </button>
                      )}
                    </div>

                    {!selectedPlanObj && (
                      <div className="pdev-cart-missing-plan">
                        <span>Elige un plan base:</span>
                        <div className="pdev-cart-quick-plans">
                          {ALL_PLANS_LIST.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleTogglePlan(p)}
                              className="pdev-cart-quick-plan-chip"
                            >
                              + {p.name} ({p.price}/mes)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {cartItems.length === 0 ? (
                      <div className="pdev-cart-empty-box">
                        <p>Tu carrito está vacío. Agrega un plan o extra para comenzar.</p>
                      </div>
                    ) : (
                      <div className="pdev-cart-items-list">
                        {cartItems.map((item) => (
                          <div key={item.id} className="pdev-cart-item-row">
                            <div className="pdev-cart-item-info">
                              <div className="pdev-cart-item-title-line">
                                <strong>{item.name}</strong>
                                <span
                                  className={`pdev-cart-period-tag ${
                                    item.billingType === 'annual' ? 'annual' : 'monthly'
                                  }`}
                                >
                                  {item.periodBadge}
                                </span>
                              </div>
                              <small>{item.subtitle}</small>

                              {item.id === 'addon-dominio' && (
                                <div className="pdev-cart-domain-switch">
                                  <button
                                    type="button"
                                    className={selectedDomainExt === 'cl' ? 'active' : ''}
                                    onClick={() => handleSelectDomainExt('cl')}
                                  >
                                    .cl ($14.990/año)
                                  </button>
                                  <button
                                    type="button"
                                    className={selectedDomainExt === 'com' ? 'active' : ''}
                                    onClick={() => handleSelectDomainExt('com')}
                                  >
                                    .com ($22.990/año)
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="pdev-cart-item-right">
                              <span className="pdev-cart-item-price">
                                {formatCLP(item.priceCLP)} CLP
                              </span>
                              <button
                                type="button"
                                className="pdev-cart-item-remove"
                                onClick={() =>
                                  item.type === 'plan'
                                    ? setSelectedPlanId(null)
                                    : handleToggleAddon(item.id)
                                }
                                title="Quitar del carrito"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="pdev-cart-quick-addons">
                      <span className="pdev-cart-quick-label">Extras opcionales:</span>
                      <div className="pdev-cart-quick-chips">
                        {EXTRA_ADDONS.map((addon) => {
                          const active = selectedAddonIds.includes(addon.id);
                          const displayPrice = addon.isDomainSelector
                            ? addon.domainOptions[selectedDomainExt].priceFormatted
                            : `${formatCLP(addon.priceCLP)}/mes`;
                          return (
                            <button
                              key={addon.id}
                              type="button"
                              onClick={() => handleToggleAddon(addon.id)}
                              className={`pdev-cart-addon-chip ${active ? 'active' : ''}`}
                            >
                              <span>{active ? '✓' : '+'}</span>
                              <span>{addon.shortTitle}</span>
                              <small>({displayPrice})</small>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {cartItems.length > 0 && (
                      <div className="pdev-cart-totals-box">
                        <div className="pdev-cart-total-line">
                          <span>Cuota mensual recurrente:</span>
                          <strong>{formatCLP(monthlyRecurringCLP)} CLP / mes</strong>
                        </div>
                        {annualDomainCLP > 0 && (
                          <div className="pdev-cart-total-line">
                            <span>Dominio .{selectedDomainExt} (1 año):</span>
                            <strong>{formatCLP(annualDomainCLP)} CLP / año</strong>
                          </div>
                        )}
                        <div className="pdev-cart-total-line pdev-cart-total-line--grand">
                          <span>Total a pagar (CLP):</span>
                          <strong>{formatCLP(totalPayTodayCLP)} CLP</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. DATOS DEL CLIENTE Y NEGOCIO */}
                  <div className="pdev-cart-section">
                    <h4>2. Datos de contacto</h4>
                    <div className="pdev-cart-form-grid">
                      <input
                        type="text"
                        placeholder="Nombre y Apellido *"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="pdev-cart-input"
                      />
                      <input
                        type="email"
                        placeholder="Correo electrónico *"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="pdev-cart-input"
                      />
                      <input
                        type="tel"
                        placeholder="Teléfono / WhatsApp (+569...) *"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        className="pdev-cart-input"
                      />
                      <input
                        type="text"
                        placeholder="Nombre de tu negocio o web (ej: mitienda.cl)"
                        value={clientProjectDomain}
                        onChange={(e) => setClientProjectDomain(e.target.value)}
                        className="pdev-cart-input"
                      />
                    </div>
                  </div>

                  {/* 3. MÉTODO DE PAGO EN CLP Y BOTÓN "PAGAR" */}
                  <div className="pdev-cart-section">
                    <h4>3. Método de pago</h4>

                    <div className="pdev-pay-methods-grid">
                      <button
                        type="button"
                        onClick={() => setMetodoPagoWeb('mercadopago')}
                        className={`pdev-pay-method-card ${
                          metodoPagoWeb === 'mercadopago' ? 'active' : ''
                        }`}
                      >
                        <img
                          src="/logos/tarjetas.png"
                          alt="Tarjetas"
                          className="pdev-pay-method-logo"
                        />
                        <div className="pdev-pay-method-text">
                          <strong>Tarjeta Débito / Crédito</strong>
                          <small>Pago automático en CLP</small>
                        </div>
                        <span className="pdev-pay-radio" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setMetodoPagoWeb('transferencia')}
                        className={`pdev-pay-method-card ${
                          metodoPagoWeb === 'transferencia' ? 'active' : ''
                        }`}
                      >
                        <div className="pdev-pay-bank-svg" aria-hidden="true">
                          🏦
                        </div>
                        <div className="pdev-pay-method-text">
                          <strong>Transferencia Bancaria</strong>
                          <small>Cuentas oficiales en CLP • 0% comisión</small>
                        </div>
                        <span className="pdev-pay-radio" />
                      </button>
                    </div>

                    {metodoPagoWeb === 'transferencia' && (
                      <div className="pdev-transfer-box">
                        <span className="pdev-transfer-subtitle">
                          Selecciona a qué cuenta transferir:
                        </span>

                        <div className="pdev-transfer-banks-row">
                          {bancosOficiales.map((banco) => (
                            <button
                              key={banco.id}
                              type="button"
                              onClick={() => setBancoSeleccionado(banco.id)}
                              className={`pdev-transfer-bank-pill ${
                                bancoSeleccionado === banco.id ? 'active' : ''
                              }`}
                            >
                              {banco.logo && <img src={banco.logo} alt={banco.nombre} />}
                              <span>{banco.nombre}</span>
                            </button>
                          ))}
                        </div>

                        {bancoSeleccionado &&
                          (() => {
                            const banco =
                              bancosOficiales.find((b) => b.id === bancoSeleccionado) ||
                              bancosOficiales[0];
                            if (!banco) return null;
                            return (
                              <div className="pdev-transfer-details-card">
                                <div className="pdev-transfer-details-head">
                                  <strong>Datos de {banco.nombre}</strong>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(banco.datos);
                                      showToast('✓ Datos bancarios copiados');
                                    }}
                                  >
                                    Copiar datos
                                  </button>
                                </div>
                                <pre>{banco.datos}</pre>
                                <div className="pdev-transfer-amount-row">
                                  <span>Monto a transferir:</span>
                                  <strong>{formatCLP(totalPayTodayCLP)} CLP</strong>
                                </div>
                              </div>
                            );
                          })()}

                        <label className="pdev-transfer-upload-label">
                          <span className="pdev-transfer-upload-icon">
                            {comprobanteFile ? '✅' : '📎'}
                          </span>
                          <div className="pdev-transfer-upload-info">
                            <strong>
                              {comprobanteFile
                                ? comprobanteFile.name
                                : 'Adjuntar comprobante de transferencia'}
                            </strong>
                            <small>
                              {comprobanteFile
                                ? 'Comprobante adjunto'
                                : 'JPG, PNG, WEBP o PDF (Máx. 10 MB)'}
                            </small>
                          </div>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            style={{ display: 'none' }}
                            onChange={(e) => setComprobanteFile(e.target.files[0] || null)}
                          />
                        </label>
                      </div>
                    )}

                    {checkoutError && (
                      <div className="pdev-checkout-error" role="alert">
                        ⚠️ {checkoutError}
                      </div>
                    )}

                    <div className="pdev-checkout-actions-stack">
                      <button
                        type="button"
                        disabled={procesandoPago || cartItems.length === 0}
                        onClick={handleUnifiedPay}
                        className="pdev-checkout-primary-btn"
                      >
                        <span>{procesandoPago ? 'Procesando...' : 'Pagar'}</span>
                      </button>

                      <a
                        href={buildWhatsAppLink(buildCartWhatsAppMessage())}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pdev-checkout-wsp-main-btn"
                      >
                        <img src={logoWsp} alt="" className="pdev-btn-inline-wsp" />
                        <span>Contratar por WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ══ SECCIÓN 5: FOOTER OFICIAL PANDASTORE (FONDO OSCURO) ═════════ */}
      <footer className="panda-footer">
        <div
          className="panda-footer__background"
          style={{ backgroundImage: `url(${footerBackground})` }}
          aria-hidden="true"
        />
        <div className="panda-footer__veil" aria-hidden="true" />
        <svg className="panda-footer__curve panda-footer__curve--back" viewBox="0 0 1440 132" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,75 C210,138 405,14 725,62 C1030,108 1220,14 1440,68 L1440,0 L0,0 Z" />
        </svg>
        <svg className="panda-footer__curve panda-footer__curve--front" viewBox="0 0 1440 132" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,88 C265,20 468,124 748,77 C1048,27 1234,118 1440,56 L1440,0 L0,0 Z" />
        </svg>

        <div className="panda-footer__content">
          <Link
            className="panda-footer__brand"
            to="/desarrollo-web"
            aria-label="Ir al inicio de PandaStore Desarrollo Web"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <span className="panda-footer__logo-shell">
              <img src={miIcono} alt="PandaStore Logo" />
            </span>
            <span>
              <strong>Panda<span>Store</span></strong>
              <small>DESARROLLO WEB POR SUSCRIPCIÓN</small>
            </span>
          </Link>

          <p className="panda-footer__message">
            Planes mensuales de desarrollo web, landing pages y tiendas online con soporte técnico incluido en Chile.
          </p>

          <nav className="panda-footer__links" aria-label="Enlaces de desarrollo web">
            <a href="#planes" onClick={() => setActiveCategory('landing')}>Landing Pages</a>
            <a href="#planes" onClick={() => setActiveCategory('ecommerce')}>Tiendas E-Commerce</a>
            <a href="#extras">Chatbot IA &amp; Extras</a>
            <a href="#soporte">Soporte Incluido</a>
            <a href="#portafolio">Portafolio</a>
          </nav>

          <div className="panda-footer__socials" aria-label="Redes sociales oficiales">
            <a
              href={buildWhatsAppLink(buildCartWhatsAppMessage())}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="PandaStore en WhatsApp"
            >
              <img src={logoWsp} alt="" />
              <span>WhatsApp</span>
            </a>

            <a
              href="https://t.me/juegosNintendoSwitchChile2"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="PandaStore en Telegram"
            >
              <svg viewBox="0 0 496 512" aria-hidden="true">
                <path d="M248 8C111 8 0 119 0 256S111 504 248 504 496 393 496 256 385 8 248 8zM363 176.7c-3.7 39.2-19.9 134.4-28.1 178.3-3.5 18.6-10.3 24.8-16.9 25.4-14.4 1.3-25.3-9.5-39.3-18.7-21.8-14.3-34.2-23.2-55.3-37.2-24.5-16.1-8.6-25 5.3-39.5 3.7-3.8 67.1-61.5 68.3-66.7.2-.7.3-3.1-1.2-4.4s-3.6-.8-5.1-.5q-3.3.7-104.6 69.1-14.8 10.2-26.9 9.9c-8.9-.2-25.9-5-38.6-9.1-15.5-5-27.9-7.7-26.8-16.3q.8-6.7 18.5-13.7 108.4-47.2 144.6-62.3c68.9-28.6 83.2-33.6 92.5-33.8 2.1 0 6.6.5 9.6 2.9a10.5 10.5 0 0 1 3.5 6.7A43.8 43.8 0 0 1 363 176.7z" />
              </svg>
              <span>Telegram</span>
            </a>
          </div>

          <div className="panda-footer__meta">
            <span>© {currentYear} PandaStore Desarrollo Web. Todos los derechos reservados.</span>
            <span className="panda-footer__status">
              <i /> Servidores online
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
