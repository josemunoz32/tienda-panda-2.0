with open('src/pages/Productos/ProductDetail.js', 'r', encoding='utf-8') as f:
    content = f.read().replace('\r\n', '\n')

# 1. Update PlayStation buttons to use clean canonical values and robust selection detection
old_pri_btn = """              const isPriSelected = selectedOption?.startsWith('ps-primary') || selectedOption === String(producto.pricePrimariaCLP) || selectedOption === String(producto.pricePrimariaUSD);
              return (
                <button
                  type="button"
                  onClick={() => setSelectedOption(moneda === "USD" ? `ps-primary:${producto.pricePrimariaUSD}` : `ps-primary:${producto.pricePrimariaCLP}`)}"""

new_pri_btn = """              const isPriSelected = !selectedOption || selectedOption.startsWith('ps-primary') || selectedOption === String(producto.pricePrimariaCLP) || selectedOption === String(producto.pricePrimariaUSD);
              return (
                <button
                  type="button"
                  onClick={() => setSelectedOption(`ps-primary:${producto.pricePrimariaCLP}`)}"""

if old_pri_btn in content:
    content = content.replace(old_pri_btn, new_pri_btn, 1)

old_sec_btn = """              const isSecSelected = selectedOption?.startsWith('ps-secondary') || selectedOption === String(producto.priceSecundariaCLP) || selectedOption === String(producto.priceSecundariaUSD);
              return (
                <button
                  type="button"
                  onClick={() => setSelectedOption(moneda === "USD" ? `ps-secondary:${producto.priceSecundariaUSD}` : `ps-secondary:${producto.priceSecundariaCLP}`)}"""

new_sec_btn = """              const isSecSelected = Boolean(selectedOption && (selectedOption.startsWith('ps-secondary') || selectedOption === String(producto.priceSecundariaCLP) || selectedOption === String(producto.priceSecundariaUSD)));
              return (
                <button
                  type="button"
                  onClick={() => setSelectedOption(`ps-secondary:${producto.priceSecundariaCLP}`)}"""

if old_sec_btn in content:
    content = content.replace(old_sec_btn, new_sec_btn, 1)

# 2. Update Reseller VIP Price Banner
old_banner = """        {/* Reseller VIP Price Banner */}
        {hasResellerBenefits(userProfile) && (() => {
          const selected = getSelectedDetails();
          const publicPrice = selected.precioPublicoCLP || selected.priceCLP || producto.priceCLP;
          const pricing = getProductPricing({ ...producto, variante: selected.variante, categoryName: productCategoryName || producto.categoria, selectedPriceCLP: publicPrice, priceCLP: publicPrice }, "revendedor", userProfile.purchaseCount || userProfile.comprasRealizadas || 0);
          if (pricing.ahorro <= 0) return null;
          return (
            <div className="product-b2b-price-card">
              <div className="product-b2b-copy">
                <span className="product-b2b-eyebrow">Beneficio B2B activo</span>
                <strong>Precio revendedor</strong>
                <span>Ahorras {formatearPrecio(pricing.ahorro)} frente al precio público</span>
              </div>
              <div className="product-b2b-value">
                <strong>{formatearPrecio(pricing.precioFinal)}</strong>
                <span>{pricing.tierInfo?.tier || "Revendedor"}</span>
              </div>
            </div>
          );
        })()}"""

new_banner = """        {/* Reseller VIP Price Banner */}
        {hasResellerBenefits(userProfile) && (() => {
          const effectiveOption = selectedOption || (isPlayStation ? `ps-primary:${producto.pricePrimariaCLP || 0}` : getDefaultProductOption(producto));
          const selected = getSelectedDetails(effectiveOption);
          const currentVariant = selected.variante || (effectiveOption.includes("secondary") ? "Secundaria" : "Primaria");
          const publicPrice = selected.precioPublicoCLP || selected.priceCLP || (currentVariant === "Secundaria" ? parseNumberCLP(producto.priceSecundariaCLP) : parseNumberCLP(producto.pricePrimariaCLP || producto.priceCLP));

          const pricing = getProductPricing({
            ...producto,
            variante: currentVariant,
            categoryName: productCategoryName || producto.categoria || "playstation",
            selectedPriceCLP: publicPrice,
            priceCLP: publicPrice
          }, "revendedor", userProfile?.purchaseCount || userProfile?.comprasRealizadas || 0);

          if (pricing.ahorro <= 0) return null;
          return (
            <div className="product-b2b-price-card">
              <div className="product-b2b-copy">
                <span className="product-b2b-eyebrow">
                  Beneficio B2B activo {isPlayStation ? `· Cuenta ${currentVariant}` : ''}
                </span>
                <strong>Precio revendedor {isPlayStation ? `(${currentVariant})` : ''}</strong>
                <span>Ahorras {formatearPrecio(pricing.ahorro)} frente al precio público ({formatearPrecio(publicPrice)})</span>
              </div>
              <div className="product-b2b-value">
                <strong>{formatearPrecio(pricing.precioFinal)}</strong>
                <span>{pricing.tierInfo?.tier || "Revendedor"}</span>
              </div>
            </div>
          );
        })()}"""

if old_banner in content:
    content = content.replace(old_banner, new_banner, 1)

# 3. Update getDefaultProductOption to pre-select Primaria for PlayStation
old_default = """function getDefaultProductOption(producto) {
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

new_default = """function getDefaultProductOption(producto) {
  if (!producto) return "";
  const plans = getMonthlyPlans(producto, "CLP");
  if (plans.length === 1) return String(plans[0].clp);
  if (plans.length > 1) return "";
  if (isSteamProduct(producto)) {
    const price = producto.priceCLP || producto.pricePrimariaCLP || 2000;
    return String(price);
  }
  const isPS = checkIsPlayStation(producto);
  if (isPS) {
    if (producto.pricePrimariaCLP) return `ps-primary:${producto.pricePrimariaCLP}`;
    if (producto.priceSecundariaCLP) return `ps-secondary:${producto.priceSecundariaCLP}`;
  }
  const variants = [{ key: "primary", price: producto.pricePrimariaCLP }, { key: "secondary", price: producto.priceSecundariaCLP }];
  const availableVariants = variants.filter((variant) => Number(variant.price) > 0);
  if (availableVariants.length === 1) return `ps-${availableVariants[0].key}:${availableVariants[0].price}`;
  if (availableVariants.length > 1) return `ps-primary:${producto.pricePrimariaCLP || availableVariants[0].price}`;
  const standard = producto.priceCLP;
  return Number(standard) > 0 ? String(standard) : "";
}"""

if old_default in content:
    content = content.replace(old_default, new_default, 1)

with open('src/pages/Productos/ProductDetail.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("ProductDetail.js updated: PlayStation B2B banner dynamically syncs with Primaria and Secundaria!")
