import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useMoneda } from "../context/MonedaContext";

export default function SearchAndFilter() {
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("Todas");
    // Removed unused variables moneda and setMoneda

  // Obtener todos los productos y categorías al cargar el componente
  useEffect(() => {
    const fetchProductsAndCategories = async () => {
      const [productsSnapshot, categoriesSnapshot] = await Promise.all([
        getDocs(collection(db, "products")),
        getDocs(collection(db, "categories")),
      ]);
      setAllProducts(
        productsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
      setCategorias(
        categoriesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      );
    };
    fetchProductsAndCategories();
  }, []);

  // Filtrar productos por nombre y mostrar hasta 6 resultados
  useEffect(() => {
    if (search.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    const results = allProducts
      .filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()))
      .slice(0, 6);
    setSearchResults(results);
  }, [search, allProducts]);


  return (
    <div style={{ padding: "14px 0", background: "#181c24", borderBottom: '1.5px solid #23272f' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Filtros de búsqueda */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 7, background: '#23272f', color: '#fff', border: '1.5px solid #330066', fontSize: 15, minWidth: 110 }}
        >
          <option value="Todas">Todas</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder="Precio mínimo"
          style={{ width: 120, padding: '8px 12px', borderRadius: 7, border: "1.5px solid #330066", background: '#23272f', color: '#fff', fontSize: 15 }}
        />
        <input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="Precio máximo"
          style={{ width: 120, padding: '8px 12px', borderRadius: 7, border: "1.5px solid #330066", background: '#23272f', color: '#fff', fontSize: 15 }}
        />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar productos..."
          style={{ width: 220, padding: '8px 12px', borderRadius: 7, border: "1.5px solid #330066", background: '#23272f', color: '#fff', fontSize: 15 }}
        />
      </div>
      {/* Resultados en tiempo real debajo del input */}
      {search.trim().length > 0 && (
        <div style={{ maxWidth: 1200, margin: '0 auto', background: '#23272f', border: '1.5px solid #330066', borderRadius: 8, boxShadow: '0 2px 8px #33006622', marginTop: 4 }}>
          {searchResults.length === 0 ? (
            <div style={{ padding: 12, color: '#888' }}>No se encontraron productos.</div>
          ) : (
            searchResults.map(prod => (
              <Link key={prod.id} to={`/producto/${prod.id}`} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', textDecoration: 'none', color: '#fff', borderBottom: '1px solid #23272f', transition: 'background 0.18s' }}
                onMouseOver={e => e.currentTarget.style.background = '#330066'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}
              >
                {prod.imageUrl && <img src={prod.imageUrl} alt={prod.name} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4, marginRight: 10 }} />}
                <span style={{ fontWeight: 500 }}>{prod.name}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}