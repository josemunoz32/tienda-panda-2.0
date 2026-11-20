// Regla de negocio: todos los productos están SIEMPRE en stock.
// La única forma de que un producto esté agotado es el campo booleano
// `agotado === true` en el documento de Firestore (toggle del admin).
export const isProductAgotado = (p) => p?.agotado === true;
