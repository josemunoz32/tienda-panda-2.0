/**
 * guides.js — guías indexables (/guias/<slug>). Contenido propio basado en el funcionamiento real
 * de PandaStore (preguntas frecuentes del sitio). `dynamic` agrega una lista de juegos reales.
 */
module.exports = [
  {
    slug: 'como-comprar-juegos-digitales-en-chile',
    title: 'Cómo comprar juegos digitales en Chile paso a paso (2026)',
    description: 'Guía completa para comprar juegos digitales en Chile para Steam, Nintendo Switch, PS5 y PS4: precios en pesos, medios de pago, entrega y activación.',
    keyword: 'comprar juegos digitales Chile',
    sections: [
      ['¿Qué es un juego digital?', [
        'Un juego digital es una licencia que se descarga directamente en tu consola o computador, sin disco ni caja. No se raya, no se pierde y queda disponible para volver a descargarlo cuando lo necesites.',
        'En Chile, comprar juegos digitales se volvió la forma más cómoda de jugar: no esperas despachos, no pagas envío y normalmente encuentras precios mucho más bajos que en formato físico.',
      ]],
      ['Paso 1: elige tu plataforma', [
        'Lo primero es saber dónde vas a jugar. En PandaStore tenemos catálogos separados para Steam PC, Nintendo Switch, Nintendo Switch 2, PS5 y PS4, cada uno con sus propias condiciones de entrega.',
        'Si juegas en PC, los juegos de Steam se activan con el PandaStore Launcher y la entrega es inmediata. Si juegas en consola, los juegos de Nintendo y PlayStation se entregan mediante un usuario externo, normalmente en 1 a 9 horas.',
      ]],
      ['Paso 2: compara precios en pesos chilenos', [
        'Todos los precios se muestran en pesos chilenos (CLP), sin conversiones sorpresa de tarjeta en dólares. En consolas puedes elegir entre cuenta primaria (juegas desde tu propio usuario) y cuenta secundaria (juegas desde el usuario entregado, a menor precio).',
      ]],
      ['Paso 3: paga con el medio que prefieras', [
        'En Chile puedes pagar con WebPay, MercadoPago, transferencia bancaria y criptomonedas (USDT). Desde el resto de Latinoamérica se aceptan PayPal, Prex y USDT según el país.',
      ]],
      ['Paso 4: recibe y activa tu juego', [
        'Después del pago recibes las instrucciones de activación en tu correo y en "Mis pedidos". Si tienes cualquier duda, el soporte responde por WhatsApp y te guía paso a paso hasta que el juego quede funcionando.',
      ]],
      ['Consejos para comprar seguro', [
        'Compra en tiendas con reseñas reales de clientes, revisa que expliquen claramente cómo se entrega el juego y desconfía de precios imposibles sin garantía. En PandaStore puedes leer las opiniones de clientes en la sección de testimonios.',
      ]],
    ],
    links: [['/juegos/juegos-digitales-chile', 'Ver todos los juegos digitales'], ['/testimonios', 'Opiniones de clientes'], ['/preguntas-frecuentes', 'Preguntas frecuentes']],
    faq: [
      ['¿Es seguro comprar juegos digitales en Chile?', 'Sí, siempre que compres en una tienda que explique el método de entrega, entregue soporte y tenga reseñas reales. PandaStore entrega soporte por WhatsApp y garantía de activación.'],
      ['¿Cuánto demora la entrega?', 'Los juegos de Steam se entregan de forma inmediata. Los de Nintendo y PlayStation normalmente demoran entre 1 y 9 horas.'],
    ],
    dynamic: { filter: 'all', title: 'Juegos digitales más baratos ahora' },
  },
  {
    slug: 'como-activar-juegos-steam-con-pandastore-launcher',
    title: 'Cómo activar juegos de Steam con PandaStore Launcher',
    description: 'Aprende a activar tus juegos de Steam en PC con el PandaStore Launcher: descarga, activación en un clic, partidas guardadas, logros y Steam Deck.',
    keyword: 'activar juegos Steam',
    sections: [
      ['¿Qué es PandaStore Launcher?', [
        'PandaStore Launcher es la aplicación oficial de PandaStore para Windows que permite activar los juegos de Steam comprados en la tienda. Con un clic el juego queda configurado y listo para jugar.',
      ]],
      ['Paso a paso para activar tu juego', [
        '1. Compra tu juego de Steam en PandaStore y espera el correo de confirmación (la entrega es inmediata).',
        '2. Descarga el PandaStore Launcher desde la página oficial de descarga e instálalo en tu PC con Windows.',
        '3. Inicia sesión y busca tu juego en la biblioteca del launcher.',
        '4. Presiona "Activar". El launcher instala los requisitos necesarios y deja el juego listo.',
        '5. Abre el juego y comienza a jugar.',
      ]],
      ['Partidas guardadas, logros y actualizaciones', [
        'Tus partidas se guardan localmente en tu computador y los logros funcionan con normalidad. Los juegos pueden recibir actualizaciones y parches sin perder tu progreso.',
      ]],
      ['¿Funciona en Steam Deck?', [
        'Sí. PandaStore Launcher tiene compatibilidad y guía paso a paso para Steam Deck en Modo Escritorio.',
      ]],
      ['¿Y si algo no funciona?', [
        'Escribe al soporte por WhatsApp indicando el juego y el error. El equipo te ayuda a dejarlo funcionando.',
      ]],
    ],
    links: [['/descargar-launcher', 'Descargar PandaStore Launcher'], ['/juegos/juegos-steam-chile', 'Ver juegos de Steam']],
    faq: [
      ['¿Necesito comprar el juego en Steam?', 'No. Compras el juego en PandaStore y lo activas con el PandaStore Launcher.'],
      ['¿Cuánto demora la entrega de un juego de Steam?', 'Es inmediata y está disponible las 24 horas.'],
    ],
    dynamic: { filter: 'steam', title: 'Juegos de Steam disponibles' },
  },
  {
    slug: 'juegos-steam-baratos-chile',
    title: 'Juegos de Steam baratos en Chile: guía de precios 2026',
    description: 'Dónde comprar juegos de Steam baratos en Chile, cómo funcionan los precios por nivel (normal, premium y estrenos) y cuáles son las mejores ofertas actuales.',
    keyword: 'juegos Steam baratos Chile',
    sections: [
      ['¿Por qué los juegos de Steam son más baratos en PandaStore?', [
        'En PandaStore los juegos de Steam se ordenan por niveles de precio fijo: una gran parte del catálogo está en el nivel normal, otros en premium y los lanzamientos más recientes en el nivel de estrenos. Así sabes exactamente cuánto pagas, en pesos chilenos.',
      ]],
      ['Cómo encontrar las mejores ofertas', [
        'Revisa las promociones de packs (por ejemplo, varios juegos por un precio especial), filtra por precio y mira las listas por género para descubrir juegos que no conocías.',
      ]],
      ['¿Qué recibo al comprar?', [
        'Recibes de inmediato las instrucciones para activar el juego con el PandaStore Launcher. Tus partidas, logros y actualizaciones funcionan con normalidad.',
      ]],
    ],
    links: [['/juegos/juegos-steam-baratos-chile', 'Ver juegos de Steam baratos'], ['/promos', 'Packs y promociones']],
    faq: [['¿Cuál es el juego de Steam más barato?', 'La lista de abajo muestra los precios actuales ordenados de menor a mayor.']],
    dynamic: { filter: 'steam-cheap', title: 'Juegos de Steam más baratos hoy' },
  },
  {
    slug: 'cuenta-primaria-vs-secundaria-ps5-ps4',
    title: 'Cuenta primaria vs secundaria en PS5 y PS4: ¿cuál conviene?',
    description: 'Diferencias entre cuenta primaria y secundaria para juegos digitales de PS5 y PS4: cómo se juega, precio y cuál te conviene según tu uso.',
    keyword: 'cuenta primaria secundaria PS5',
    sections: [
      ['¿Qué es una cuenta primaria?', [
        'Con una cuenta primaria el juego se puede jugar directamente desde tu propio usuario personal de PlayStation. Es la opción más cómoda si quieres jugar con tu perfil, tus trofeos y tus amigos.',
      ]],
      ['¿Qué es una cuenta secundaria?', [
        'Con una cuenta secundaria el juego solo se puede jugar desde el usuario entregado, no desde tu cuenta personal. A cambio, el precio es más bajo.',
      ]],
      ['¿Cuál me conviene?', [
        'Si quieres jugar con tu perfil y en línea con tus amigos, elige primaria. Si buscas el menor precio y no te importa cambiar de usuario para jugar, la secundaria es una excelente opción.',
      ]],
      ['Reglas importantes', [
        'El usuario entregado no se puede modificar, eliminar ni cambiar de contraseña, y es solo para uso personal. La entrega demora normalmente entre 1 y 9 horas y los juegos tienen garantía de funcionamiento.',
      ]],
    ],
    links: [['/instalacion-playstation', 'Cómo instalar juegos de PlayStation'], ['/juegos/juegos-ps5-digitales-chile', 'Juegos digitales PS5'], ['/juegos/juegos-ps4-digitales-chile', 'Juegos digitales PS4']],
    faq: [['¿Puedo jugar en línea con cuenta secundaria?', 'Juegas desde el usuario entregado; para jugar con tu propio perfil elige cuenta primaria.']],
    dynamic: { filter: 'ps5', title: 'Juegos de PS5 disponibles' },
  },
  {
    slug: 'como-descargar-juegos-nintendo-switch-digitales',
    title: 'Cómo descargar juegos digitales de Nintendo Switch',
    description: 'Guía para descargar juegos digitales en Nintendo Switch con un usuario externo: pasos, tiempos de entrega, garantía y preguntas frecuentes.',
    keyword: 'juegos Nintendo Switch digitales',
    sections: [
      ['¿Cómo se entregan los juegos de Nintendo?', [
        'Los juegos de Nintendo Switch se entregan mediante un usuario externo que contiene el juego. Agregas ese usuario a tu consola, descargas el juego y lo juegas desde tu propia cuenta personal. El juego permanece en el usuario original.',
      ]],
      ['Pasos para descargar', [
        '1. Compra el juego y recibe los datos del usuario (normalmente entre 1 y 9 horas).',
        '2. En tu Switch, agrega el usuario entregado siguiendo la guía de instalación.',
        '3. Entra a la eShop con ese usuario y descarga el juego.',
        '4. Vuelve a tu usuario personal y juega.',
      ]],
      ['Lo que debes saber', [
        'No se puede modificar, eliminar ni cambiar la contraseña del usuario entregado. La garantía cubre la correcta activación y descarga inicial. Puedes tener varios juegos de distintos usuarios al mismo tiempo.',
      ]],
    ],
    links: [['/instalacion-nintendo', 'Guía de instalación Nintendo'], ['/juegos/juegos-nintendo-switch-digitales-chile', 'Juegos Switch digitales'], ['/packs-nintendo', 'Packs Nintendo']],
    faq: [['¿Puedo jugar con mi propia cuenta?', 'Sí, descargas el juego y lo juegas desde tu cuenta personal.']],
    dynamic: { filter: 'switch', title: 'Juegos de Nintendo Switch disponibles' },
  },
  {
    slug: 'mejores-juegos-nintendo-switch',
    title: 'Mejores juegos de Nintendo Switch para comprar en digital',
    description: 'Selección de los mejores juegos de Nintendo Switch disponibles en formato digital en Chile, por género: aventura, multijugador, familia y RPG.',
    keyword: 'mejores juegos Nintendo Switch',
    sections: [
      ['Cómo elegir tu próximo juego de Switch', [
        'Piensa en con quién vas a jugar. Si juegas en familia, busca títulos multijugador e infantiles; si juegas solo, las aventuras y los RPG ofrecen decenas de horas. Más abajo verás juegos reales disponibles hoy con su precio en pesos.',
      ]],
      ['Por género', [
        'Revisa las listas de aventura, multijugador, infantiles y RPG para Nintendo Switch: cada una muestra solo juegos que puedes comprar ahora.',
      ]],
    ],
    links: [['/juegos/nintendo-switch-aventura', 'Aventura en Switch'], ['/juegos/nintendo-switch-multijugador', 'Multijugador en Switch'], ['/juegos/nintendo-switch-infantil', 'Infantiles en Switch']],
    faq: [],
    dynamic: { filter: 'switch', title: 'Juegos de Switch disponibles hoy' },
  },
  {
    slug: 'mejores-juegos-ps5',
    title: 'Mejores juegos de PS5 en formato digital',
    description: 'Los mejores juegos digitales de PS5 disponibles en Chile: acción, aventura, deportes y RPG con precio en pesos y entrega en horas.',
    keyword: 'mejores juegos PS5',
    sections: [
      ['Qué buscar en un juego de PS5', [
        'La PS5 brilla con mundos abiertos, juegos de acción y deportes con gráficos de nueva generación. Elige según el género que más disfrutes y revisa si prefieres cuenta primaria o secundaria.',
      ]],
    ],
    links: [['/juegos/juegos-ps5-digitales-chile', 'Juegos digitales PS5'], ['/guias/cuenta-primaria-vs-secundaria-ps5-ps4', 'Primaria vs secundaria']],
    faq: [],
    dynamic: { filter: 'ps5', title: 'Juegos de PS5 disponibles hoy' },
  },
  {
    slug: 'juegos-steam-para-pc-de-bajos-recursos',
    title: 'Juegos de Steam para PC de bajos recursos',
    description: 'Ideas de juegos de Steam livianos para PC de bajos recursos o notebooks, con precios bajos en Chile y activación inmediata.',
    keyword: 'juegos PC bajos recursos',
    sections: [
      ['¿Qué juegos funcionan en un PC básico?', [
        'Los juegos indie, de estrategia, puzzle y plataformas 2D suelen requerir menos potencia. Antes de comprar, revisa en la ficha de cada juego el espacio necesario y los requisitos.',
      ]],
      ['Consejos para que corran mejor', [
        'Cierra programas en segundo plano, baja la resolución y la calidad de sombras, y actualiza los controladores de video.',
      ]],
    ],
    links: [['/juegos/steam-indie', 'Juegos indie de Steam'], ['/juegos/steam-estrategia', 'Estrategia en Steam']],
    faq: [],
    dynamic: { filter: 'steam-indie', title: 'Juegos indie de Steam' },
  },
  {
    slug: 'medios-de-pago-juegos-digitales-latinoamerica',
    title: 'Cómo pagar juegos digitales desde Latinoamérica',
    description: 'Medios de pago para comprar juegos digitales desde Chile, México, Perú, Argentina, Colombia y Uruguay: PayPal, Prex, USDT, WebPay y MercadoPago.',
    keyword: 'pagar juegos digitales Latinoamérica',
    sections: [
      ['Chile', ['WebPay, MercadoPago, transferencia bancaria y criptomonedas (USDT).']],
      ['México y Colombia', ['PayPal y criptomonedas (USDT).']],
      ['Perú, Argentina y Uruguay', ['Prex, PayPal y criptomonedas (USDT).']],
      ['¿En qué moneda se paga?', [
        'En Chile los precios están en pesos chilenos. Fuera de Chile el precio se muestra en dólares (USD) o en tu moneda local de referencia, según el medio de pago.',
      ]],
    ],
    links: [['/juegos/juegos-digitales-latinoamerica', 'Juegos digitales para Latinoamérica'], ['/preguntas-frecuentes', 'Preguntas frecuentes']],
    faq: [['¿Puedo comprar desde fuera de Chile?', 'Sí, se puede comprar desde toda Latinoamérica con PayPal, Prex o USDT según el país.']],
  },
  {
    slug: 'juegos-cooperativos-para-jugar-con-amigos',
    title: 'Juegos cooperativos para jugar con amigos en PC y consola',
    description: 'Los mejores juegos cooperativos y multijugador para jugar con amigos en Steam, Nintendo Switch y PlayStation, disponibles en Chile.',
    keyword: 'juegos cooperativos para jugar con amigos',
    sections: [
      ['Cooperativo en línea o local', [
        'Algunos juegos permiten jugar con amigos por internet y otros en la misma pantalla. En Switch abundan los juegos para jugar juntos en casa; en PC destacan los cooperativos en línea.',
      ]],
    ],
    links: [['/juegos/steam-cooperativo', 'Cooperativos en Steam'], ['/juegos/nintendo-switch-multijugador', 'Multijugador en Switch']],
    faq: [],
    dynamic: { filter: 'coop', title: 'Juegos cooperativos disponibles' },
  },
];
