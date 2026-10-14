const fs = require('fs');
let content = fs.readFileSync('src/pages/Categorias/CategoriaPage.js', 'utf8');

// 1. Add ReactDOM import
content = content.replace(
  'import React, { useEffect, useState } from "react";\r\n',
  'import React, { useEffect, useState } from "react";\r\nimport ReactDOM from "react-dom";\r\n'
);

// 2. Wrap the filter modal with ReactDOM.createPortal
// Find: '      {/* Filter Modal */}\r\n      {showFilterModal && ('
// Replace with portal version
content = content.replace(
  '      {/* Filter Modal */}\r\n      {showFilterModal && (',
  '      {/* Filter Modal — rendered via portal to escape stacking context */}\r\n      {showFilterModal && ReactDOM.createPortal(('
);

// Find the closing of the modal: '      )}\r\n\r\n      {/* Product grid */}'
// Change ')}'  to '), document.body)}'
content = content.replace(
  '      )}\r\n\r\n      {/* Product grid */}',
  '      ), document.body)}\r\n\r\n      {/* Product grid */}'
);

fs.writeFileSync('src/pages/Categorias/CategoriaPage.js', content, 'utf8');
console.log('Done!');
