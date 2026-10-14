with open('src/pages/Productos/ProductDetail.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('\r\n', '\n')

# 1. Update the box with the discounted & normal price
old_box = """          {/* Precio tachado ficticio si hay una opción seleccionada */}
          {selectedOption && (() => {
            const selectedDetails = getSelectedDetails();
            const optionAmount = Number(String(selectedOption).split(":").pop()) || 0;
            const currentTotal = Number(
              moneda === "USD"
                ? (selectedDetails.priceUSD || optionAmount)
                : (selectedDetails.precioPublicoCLP || selectedDetails.priceCLP || optionAmount)
            );
            if (!Number.isFinite(currentTotal) || currentTotal <= 0) return null;
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px dashed rgba(162,89,255,0.3)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.85rem', color: '#a084cc', textDecoration: 'line-through', marginBottom: 2 }}>
                    Precio Normal: {moneda === "USD" 
                      ? `$${(currentTotal / (1 - discountPercent / 100)).toFixed(2)}` 
                      : `$${Math.round(currentTotal / (1 - discountPercent / 100)).toLocaleString("es-CL")}`}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f357a8', lineHeight: 1 }}>
                    {moneda === "USD" ? `$${currentTotal.toFixed(2)} USD` : `$${currentTotal.toLocaleString("es-CL")} CLP`}
                  </div>
                </div>
                <div style={{ background: 'linear-gradient(90deg, #ffcc00, #ff9900)', color: '#000', padding: '4px 8px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 800, boxShadow: '0 2px 8px rgba(255,204,0,0.3)' }}>
                  -{discountPercent}% OFF
                </div>
              </div>
            );
          })()}"""

new_box = """          {/* Precio tachado ficticio si hay una opción seleccionada */}
          {selectedOption && (() => {
            const selectedDetails = getSelectedDetails();
            const optionAmount = Number(String(selectedOption).split(":").pop()) || 0;
            let clpTotal = Number(
              selectedDetails.precioPublicoCLP || selectedDetails.priceCLP || (optionAmount > 100 ? optionAmount : 0) || producto.priceCLP || 2000
            );
            if (!Number.isFinite(clpTotal) || clpTotal <= 0) clpTotal = 2000;

            const clpNormal = Math.round(clpTotal / (1 - discountPercent / 100));
            const precioActualFormat = formatearPrecio(clpTotal);
            const precioNormalFormat = formatearPrecio(clpNormal);

            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottom: '1px dashed rgba(162,89,255,0.3)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '0.85rem', color: '#a084cc', textDecoration: 'line-through', marginBottom: 2 }}>
                    Precio Normal: {precioNormalFormat}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f357a8', lineHeight: 1 }}>
                    {precioActualFormat} {moneda}
                  </div>
                </div>
                <div style={{ background: 'linear-gradient(90deg, #ffcc00, #ff9900)', color: '#000', padding: '4px 8px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 800, boxShadow: '0 2px 8px rgba(255,204,0,0.3)' }}>
                  -{discountPercent}% OFF
                </div>
              </div>
            );
          })()}"""

if old_box in content:
    content = content.replace(old_box, new_box, 1)

# 2. Update getSelectedDetails for Steam products
old_steam_details = """      if (isSteamProd) {
        const priceNum = Number(optionValue);
        if (moneda === "USD") {
          details = { priceUSD: priceNum || producto.priceUSD || 2.00, priceCLP: producto.priceCLP || 2000 };
        } else {
          details = { priceCLP: priceNum || producto.priceCLP || 2000, priceUSD: producto.priceUSD || 2.00 };
        }
      }"""

new_steam_details = """      if (isSteamProd) {
        const priceNum = Number(optionValue);
        const clpPrice = (priceNum && priceNum > 100) ? priceNum : (Number(producto.priceCLP) || 2000);
        details = { priceCLP: clpPrice };
      }"""

if old_steam_details in content:
    content = content.replace(old_steam_details, new_steam_details, 1)

# 3. Update getDefaultProductOption
old_default_option = """function getDefaultProductOption(producto, moneda) {
  if (!producto) return "";
  const plans = getMonthlyPlans(producto, moneda);
  if (plans.length === 1) return String(moneda === "USD" ? plans[0].usd : plans[0].clp);
  if (plans.length > 1) return "";
  if (isSteamProduct(producto)) {
    const price = moneda === "USD"
      ? (producto.priceUSD || producto.pricePrimariaUSD || ((Number(producto.priceCLP || producto.pricePrimariaCLP || 2000) / 1000).toFixed(2)))
      : (producto.priceCLP || producto.pricePrimariaCLP || 2000);
    return price ? String(price) : "";
  }
  const variants = moneda === "USD"
    ? [{ key: "primary", price: producto.pricePrimariaUSD }, { key: "secondary", price: producto.priceSecundariaUSD }]
    : [{ key: "primary", price: producto.pricePrimariaCLP }, { key: "secondary", price: producto.priceSecundariaCLP }];
  const availableVariants = variants.filter((variant) => Number(variant.price) > 0);
  if (availableVariants.length === 1) return `ps-${availableVariants[0].key}:${availableVariants[0].price}`;
  if (availableVariants.length > 1) return "";
  const standard = moneda === "USD" ? producto.priceUSD : producto.priceCLP;
  return Number(standard) > 0 ? String(standard) : "";
}"""

new_default_option = """function getDefaultProductOption(producto) {
  if (!producto) return "";
  const plans = getMonthlyPlans(producto, "CLP");
  if (plans.length === 1) return String(plans[0].clp);
  if (plans.length > 1) return "";
  if (isSteamProduct(producto)) {
    const price = producto.priceCLP || producto.pricePrimariaCLP || 2000;
    return String(price);
  }
  const variants = [{ key: "primary", price: producto.pricePrimariaCLP }, { key: "secondary", price: producto.priceSecundariaCLP }];
  const availableVariants = variants.filter((variant) => Number(variant.price) > 0);
  if (availableVariants.length === 1) return `ps-${availableVariants[0].key}:${availableVariants[0].price}`;
  if (availableVariants.length > 1) return "";
  const standard = producto.priceCLP;
  return Number(standard) > 0 ? String(standard) : "";
}"""

if old_default_option in content:
    content = content.replace(old_default_option, new_default_option, 1)

with open('src/pages/Productos/ProductDetail.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("ProductDetail.js updated to dynamic dollar box pricing!")
