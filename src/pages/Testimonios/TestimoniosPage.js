import React from "react";
import { Helmet } from "react-helmet-async";
import TestimoniosCrud from "../../components/TestimoniosCrud";

export default function TestimoniosPage() {
  return (
    <div style={{padding:'32px 0'}}>
      <Helmet>
        <title>Opiniones y Testimonios de Clientes | ¿PandaStore es Confiable? - PandaStore</title>
        <meta name="description" content="Conoce las opiniones reales y testimonios de miles de clientes de PandaStore en toda Latinoamérica. Tienda 100% confiable de videojuegos digitales con entrega inmediata 24/7." />
        <meta name="keywords" content="opiniones pandastore, testimonios pandastore, pandastore es confiable, valoraciones clientes pandastore, comprar juegos digitales seguro" />
        <meta property="og:title" content="Opiniones y Testimonios de Clientes | PandaStore" />
        <meta property="og:description" content="Descubre lo que opinan nuestros clientes satisfechos sobre PandaStore. Garantía y soporte 24/7." />
        <meta property="og:url" content="https://pandastoregaming.cl/testimonios" />
        <meta property="og:image" content="https://pandastoregaming.cl/banner.png" />
        <link rel="canonical" href="https://pandastoregaming.cl/testimonios" />
      </Helmet>
      <TestimoniosCrud />
    </div>
  );
}
