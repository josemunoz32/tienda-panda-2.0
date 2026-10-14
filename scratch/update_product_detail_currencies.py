with open('src/pages/Productos/ProductDetail.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('\r\n', '\n')

old_price_selector = """  if (moneda === "CLP") {
    if (!hasMonthlyPlans && isSteam) {
      const steamCLP = producto.priceCLP || producto.pricePrimariaCLP || 2000;
      options.push({ label: `Steam CLP: ${steamCLP}`, value: String(steamCLP) });
    } else if (!hasMonthlyPlans && isPlayStation) {
      const hasPrimary = Boolean(producto.pricePrimariaCLP);
      const hasSecondary = Boolean(producto.priceSecundariaCLP);

      if (hasPrimary) {
        const rawPri = parseNumberCLP(producto.pricePrimariaCLP);
        let priDisplay = rawPri;
        if (isReseller && rawPri > 0) {
          const pr = getProductPricing({ ...producto, variante: 'primaria', selectedPriceCLP: rawPri, priceCLP: rawPri, categoryName: 'playstation' }, 'revendedor', userProfile?.purchaseCount || 0);
          priDisplay = pr.precioFinal;
        }
        options.push({
          label: `${plataformaLabel ? plataformaLabel + ' ' : ''}Primaria CLP: ${formatearPrecio(priDisplay)}${isReseller ? ' (💎 Revendedor)' : ''}`,
          value: `ps-primary:${producto.pricePrimariaCLP}`
        });
      }
      if (hasSecondary) {
        const rawSec = parseNumberCLP(producto.priceSecundariaCLP);
        let secDisplay = rawSec;
        if (isReseller && rawSec > 0) {
          const pr = getProductPricing({ ...producto, variante: 'secundaria', selectedPriceCLP: rawSec, priceCLP: rawSec, categoryName: 'playstation' }, 'revendedor', userProfile?.purchaseCount || 0);
          secDisplay = pr.precioFinal;
        }
        options.push({
          label: `${plataformaLabel ? plataformaLabel + ' ' : ''}Secundaria CLP: ${formatearPrecio(secDisplay)}${isReseller ? ' (💎 Revendedor)' : ''}`,
          value: `ps-secondary:${producto.priceSecundariaCLP}`
        });
      }
    } else if (!hasMonthlyPlans && producto.priceCLP) {
      if (isSwitch) {
        options.push({ label: `Switch CLP: ${producto.priceCLP}`, value: String(producto.priceCLP) });
      } else {
        options.push({ label: `Estándar CLP: ${producto.priceCLP}`, value: String(producto.priceCLP) });
      }
    }

    if (Array.isArray(producto.preciosPorMes)) {
      producto.preciosPorMes.forEach((p) => {
        if (p.clp)
          options.push({ label: `${producto.modalidadServicio === "cuenta" ? "Cuenta completa" : producto.modalidadServicio === "perfil" ? "Perfil" : "Suscripción"} ${p.meses} mes(es) CLP: ${p.clp}`, value: String(p.clp) });
      });
    }
  } else if (moneda === "USD") {
    if (!hasMonthlyPlans && isSteam) {
      const steamUSD = producto.priceUSD || producto.pricePrimariaUSD || ((Number(producto.priceCLP || producto.pricePrimariaCLP || 2000) / 1000).toFixed(2));
      options.push({ label: `Steam USD: ${steamUSD}`, value: String(steamUSD) });
    } else if (!hasMonthlyPlans && isPlayStation) {
      const hasPrimary = Boolean(producto.pricePrimariaUSD);
      const hasSecondary = Boolean(producto.priceSecundariaUSD);

      if (hasPrimary) {
        options.push({ label: `${plataformaLabel ? plataformaLabel + ' ' : ''}Primaria USD: ${producto.pricePrimariaUSD}`, value: `ps-primary:${producto.pricePrimariaUSD}` });
      }
      if (hasSecondary) {
        options.push({ label: `${plataformaLabel ? plataformaLabel + ' ' : ''}Secundaria USD: ${producto.priceSecundariaUSD}`, value: `ps-secondary:${producto.priceSecundariaUSD}` });
      }
    } else if (!hasMonthlyPlans && producto.priceUSD) {
      if (isSwitch) {
        options.push({ label: `Switch USD: ${producto.priceUSD}`, value: String(producto.priceUSD) });
      } else {
        options.push({ label: `Estándar USD: ${producto.priceUSD}`, value: String(producto.priceUSD) });
      }
    }

    if (Array.isArray(producto.preciosPorMes)) {
      producto.preciosPorMes.forEach((p) => {
        if (p.usd)
          options.push({ label: `${producto.modalidadServicio === "cuenta" ? "Cuenta completa" : producto.modalidadServicio === "perfil" ? "Perfil" : "Suscripción"} ${p.meses} mes(es) USD: ${p.usd}`, value: String(p.usd) });
      });
    }
  } else {
    // PEN, ARS, UYU, COP, MXN — usan CLP como base, formatearPrecio convierte
    if (!hasMonthlyPlans && isSteam) {
      const steamCLP = producto.priceCLP || producto.pricePrimariaCLP || 2000;
      options.push({ label: `Steam: ${formatearPrecio(steamCLP)}`, value: String(steamCLP) });
    } else if (!hasMonthlyPlans && isPlayStation) {
      const hasPrimary = Boolean(producto.pricePrimariaCLP);
      const hasSecondary = Boolean(producto.priceSecundariaCLP);

      if (hasPrimary) {
        options.push({ label: `${plataformaLabel ? plataformaLabel + ' ' : ''}Primaria: ${formatearPrecio(producto.pricePrimariaCLP)}`, value: `ps-primary:${producto.pricePrimariaCLP}` });
      }
      if (hasSecondary) {
        options.push({ label: `${plataformaLabel ? plataformaLabel + ' ' : ''}Secundaria: ${formatearPrecio(producto.priceSecundariaCLP)}`, value: `ps-secondary:${producto.priceSecundariaCLP}` });
      }
    } else if (!hasMonthlyPlans && producto.priceCLP) {
      if (isSwitch) {
        options.push({ label: `Switch: ${formatearPrecio(producto.priceCLP)}`, value: String(producto.priceCLP) });
      } else {
        options.push({ label: `Estándar: ${formatearPrecio(producto.priceCLP)}`, value: String(producto.priceCLP) });
      }
    }

    if (Array.isArray(producto.preciosPorMes)) {
      producto.preciosPorMes.forEach((p) => {
        if (p.clp)
          options.push({ label: `${producto.modalidadServicio === "cuenta" ? "Cuenta completa" : producto.modalidadServicio === "perfil" ? "Perfil" : "Suscripción"} ${p.meses} mes(es): ${formatearPrecio(p.clp)}`, value: String(p.clp) });
      });
    }
  }"""

new_price_selector = """  // Para cualquier moneda (CLP, USD, PEN, COP, ARS, etc.), usamos el precio base CLP
  // y lo convertimos con formatearPrecio, garantizando respuesta en tiempo real al dólar fijado
  if (!hasMonthlyPlans && isSteam) {
    const steamCLP = producto.priceCLP || producto.pricePrimariaCLP || 2000;
    options.push({ label: `Steam: ${formatearPrecio(steamCLP)}`, value: String(steamCLP) });
  } else if (!hasMonthlyPlans && isPlayStation) {
    const hasPrimary = Boolean(producto.pricePrimariaCLP);
    const hasSecondary = Boolean(producto.priceSecundariaCLP);

    if (hasPrimary) {
      const rawPri = parseNumberCLP(producto.pricePrimariaCLP);
      let priDisplay = rawPri;
      if (isReseller && rawPri > 0) {
        const pr = getProductPricing({ ...producto, variante: 'primaria', selectedPriceCLP: rawPri, priceCLP: rawPri, categoryName: 'playstation' }, 'revendedor', userProfile?.purchaseCount || 0);
        priDisplay = pr.precioFinal;
      }
      options.push({
        label: `${plataformaLabel ? plataformaLabel + ' ' : ''}Primaria: ${formatearPrecio(priDisplay)}${isReseller ? ' (💎 Revendedor)' : ''}`,
        value: `ps-primary:${producto.pricePrimariaCLP}`
      });
    }
    if (hasSecondary) {
      const rawSec = parseNumberCLP(producto.priceSecundariaCLP);
      let secDisplay = rawSec;
      if (isReseller && rawSec > 0) {
        const pr = getProductPricing({ ...producto, variante: 'secundaria', selectedPriceCLP: rawSec, priceCLP: rawSec, categoryName: 'playstation' }, 'revendedor', userProfile?.purchaseCount || 0);
        secDisplay = pr.precioFinal;
      }
      options.push({
        label: `${plataformaLabel ? plataformaLabel + ' ' : ''}Secundaria: ${formatearPrecio(secDisplay)}${isReseller ? ' (💎 Revendedor)' : ''}`,
        value: `ps-secondary:${producto.priceSecundariaCLP}`
      });
    }
  } else if (!hasMonthlyPlans && (producto.priceCLP || producto.precio_clp)) {
    const baseCLP = parseNumberCLP(producto.priceCLP || producto.precio_clp);
    if (isSwitch) {
      options.push({ label: `Nintendo Switch: ${formatearPrecio(baseCLP)}`, value: String(baseCLP) });
    } else {
      options.push({ label: `Estándar: ${formatearPrecio(baseCLP)}`, value: String(baseCLP) });
    }
  }

  if (Array.isArray(producto.preciosPorMes)) {
    producto.preciosPorMes.forEach((p) => {
      if (p.clp)
        options.push({ label: `${producto.modalidadServicio === "cuenta" ? "Cuenta completa" : producto.modalidadServicio === "perfil" ? "Perfil" : "Suscripción"} ${p.meses} mes(es): ${formatearPrecio(p.clp)}`, value: String(p.clp) });
    });
  }"""

if old_price_selector in content:
    content = content.replace(old_price_selector, new_price_selector, 1)

old_pri_btn = """                  <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                    {moneda === "USD" ? `$${producto.pricePrimariaUSD || 0}` : formatearPrecio(priDisplay)}
                  </span>"""
new_pri_btn = """                  <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                    {formatearPrecio(priDisplay)}
                  </span>"""
if old_pri_btn in content:
    content = content.replace(old_pri_btn, new_pri_btn, 1)

old_sec_btn = """                  <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                    {moneda === "USD" ? `$${producto.priceSecundariaUSD || 0}` : formatearPrecio(secDisplay)}
                  </span>"""
new_sec_btn = """                  <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                    {formatearPrecio(secDisplay)}
                  </span>"""
if old_sec_btn in content:
    content = content.replace(old_sec_btn, new_sec_btn, 1)

with open('src/pages/Productos/ProductDetail.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("ProductDetail.js updated to use unified dynamic currency conversions!")
