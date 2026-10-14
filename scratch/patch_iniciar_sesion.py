with open(r'c:\Users\Usuario\proyectopandastore20\src\pages\IniciarSesion\IniciarSesion.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Initialize resellerModalOpen from URL params
old_init = 'const [resellerModalOpen, setResellerModalOpen] = useState(false);'
new_init = '''const [resellerModalOpen, setResellerModalOpen] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get("mode") === "revendedor" || params.get("revendedor") === "true" || params.get("revendedor") === "1";
  });'''

if old_init in content:
    content = content.replace(old_init, new_init)
    print("resellerModalOpen state initialized from URL params!")
else:
    print("resellerModalOpen init target not found!")

# 2. Update useEffect to also open modal if params change
old_effect = '''  useEffect(() => {
    if (location.pathname === "/registro") {
      setActiveTab("register");
    } else if (location.pathname === "/iniciar-sesion") {
      const params = new URLSearchParams(location.search);
      if (params.get("mode") === "registro") {
        setActiveTab("register");
      } else {
        setActiveTab("login");
      }
    }
    setError("");
    setSuccessMsg("");
  }, [location.pathname, location.search]);'''

new_effect = '''  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("mode") === "revendedor" || params.get("revendedor") === "true" || params.get("revendedor") === "1") {
      setResellerModalOpen(true);
    }
    if (location.pathname === "/registro") {
      setActiveTab("register");
    } else if (location.pathname === "/iniciar-sesion") {
      if (params.get("mode") === "registro") {
        setActiveTab("register");
      } else {
        setActiveTab("login");
      }
    }
    setError("");
    setSuccessMsg("");
  }, [location.pathname, location.search]);'''

if old_effect in content:
    content = content.replace(old_effect, new_effect)
    print("useEffect updated with reseller modal auto-open!")
else:
    print("useEffect target not found!")

with open(r'c:\Users\Usuario\proyectopandastore20\src\pages\IniciarSesion\IniciarSesion.js', 'w', encoding='utf-8') as f:
    f.write(content)
print("IniciarSesion.js finished!")
