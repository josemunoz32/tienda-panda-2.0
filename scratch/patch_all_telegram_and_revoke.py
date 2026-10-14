import re

# ==============================================================================
# 1. PATCH IniciarSesion.js
# ==============================================================================
path_login = r"c:\Users\Usuario\proyectopandastore20\src\pages\IniciarSesion\IniciarSesion.js"
with open(path_login, "r", encoding="utf-8") as f:
    content_login = f.read()

if "notifyNewResellerApplication" not in content_login:
    # Add import
    import_stmt = 'import { notifyNewResellerApplication } from "../../utils/telegramNotifications";\n'
    content_login = import_stmt + content_login

    # Add notification call after saving request
    target_code = """    // Un documento por UID evita solicitudes duplicadas y spam desde la UI.
    if (!existingRequest.exists()) {
      await setDoc(requestRef, {
        userId: applicantUid,
        email,
        whatsapp,
        nombre: applicantUser.displayName || email.split("@")[0],
        estado: "pendiente",
        authMethod: applicantUser.providerData?.some((provider) => provider.providerId === "google.com") ? "google" : "password",
        fecha: new Date().toISOString()
      });
    }"""

    replacement_code = """    // Un documento por UID evita solicitudes duplicadas y spam desde la UI.
    if (!existingRequest.exists()) {
      await setDoc(requestRef, {
        userId: applicantUid,
        email,
        whatsapp,
        nombre: applicantUser.displayName || email.split("@")[0],
        estado: "pendiente",
        authMethod: applicantUser.providerData?.some((provider) => provider.providerId === "google.com") ? "google" : "password",
        fecha: new Date().toISOString()
      });

      // Notificar al bot de Telegram del administrador
      notifyNewResellerApplication({
        nombre: applicantUser.displayName || email.split("@")[0],
        email,
        whatsapp
      }).catch((err) => console.error("Error enviando alerta telegram revendedor:", err));
    }"""

    if target_code in content_login:
        content_login = content_login.replace(target_code, replacement_code, 1)
        with open(path_login, "w", encoding="utf-8") as f:
            f.write(content_login)
        print("IniciarSesion.js patched with Telegram notification!")
    else:
        print("Warning: target_code not found in IniciarSesion.js")
else:
    print("IniciarSesion.js already has notifyNewResellerApplication")


# ==============================================================================
# 2. PATCH Perfil.js
# ==============================================================================
path_perfil = r"c:\Users\Usuario\proyectopandastore20\src\pages\Perfil\Perfil.js"
with open(path_perfil, "r", encoding="utf-8") as f:
    content_perfil = f.read()

if "notifyNewWalletRecharge" not in content_perfil:
    # Add import
    import_stmt_perfil = 'import { notifyNewResellerApplication, notifyNewWalletRecharge } from "../../utils/telegramNotifications";\n'
    content_perfil = import_stmt_perfil + content_perfil

    # Add notification for recarga
    recarga_target = """      await addDoc(collection(db, "recargas_billetera"), {
        userId: user.uid,
        userEmail: user.email,
        userName: profile.displayName || user.email,
        montoCLP: amount,
        cotizacion: cotizacionData,
        banco: nombreBanco,
        comprobanteUrl: fileUrl,
        estado: "pendiente",
        createdAt: new Date().toISOString()
      });"""

    recarga_replacement = """      await addDoc(collection(db, "recargas_billetera"), {
        userId: user.uid,
        userEmail: user.email,
        userName: profile.displayName || user.email,
        montoCLP: amount,
        cotizacion: cotizacionData,
        banco: nombreBanco,
        comprobanteUrl: fileUrl,
        estado: "pendiente",
        createdAt: new Date().toISOString()
      });

      // Notificar al bot de Telegram del Administrador
      notifyNewWalletRecharge({
        userName: profile.displayName || user.email,
        userEmail: user.email,
        montoCLP: amount,
        banco: nombreBanco,
        comprobanteUrl: fileUrl
      }).catch((e) => console.error("Error enviando alerta telegram recarga:", e));"""

    if recarga_target in content_perfil:
        content_perfil = content_perfil.replace(recarga_target, recarga_replacement, 1)
        print("Perfil.js recarga notification added!")
    else:
        print("Warning: recarga_target not found in Perfil.js")

    # Add notification for reseller application
    reseller_target = """      await addDoc(collection(db, "solicitudes_revendedores"), solData);
      setSolicitudRevendedor(solData);"""

    reseller_replacement = """      await addDoc(collection(db, "solicitudes_revendedores"), solData);
      setSolicitudRevendedor(solData);

      // Notificar al bot de Telegram del Administrador
      notifyNewResellerApplication({
        nombre: displayName,
        email: user.email,
        whatsapp: phone
      }).catch((e) => console.error("Error enviando alerta telegram revendedor:", e));"""

    if reseller_target in content_perfil:
        content_perfil = content_perfil.replace(reseller_target, reseller_replacement, 1)
        print("Perfil.js reseller notification added!")
    else:
        print("Warning: reseller_target not found in Perfil.js")

    with open(path_perfil, "w", encoding="utf-8") as f:
        f.write(content_perfil)
else:
    print("Perfil.js already has notifyNewWalletRecharge")


# ==============================================================================
# 3. PATCH PortalDistribuidor.js
# ==============================================================================
path_dist = r"c:\Users\Usuario\proyectopandastore20\src\pages\PortalDistribuidor\PortalDistribuidor.js"
with open(path_dist, "r", encoding="utf-8") as f:
    content_dist = f.read()

if "notifyNewDistributorRequest" not in content_dist:
    # Add import
    import_stmt_dist = 'import { notifyNewDistributorRequest } from "../../utils/telegramNotifications";\n'
    content_dist = import_stmt_dist + content_dist

    dist_target = """        // Guardar solicitud de distribuidor
        await addDoc(collection(db, "solicitudes_distribuidores"), {
          userId: currentUser.uid,
          userEmail: currentUser.email,
          userName: userData?.displayName || userData?.firstName || currentUser.email,
          tipo: isPlan ? "adquisicion_plan" : isRecharge ? "recarga_billetera" : "compra_claves_extras",
          planId: isPlan ? item.id : null,
          planName: isPlan ? item.name : null,
          extraCount: !isPlan && !isRecharge ? item.count : 0,
          itemTitle: title,
          montoCLP: amount,
          cotizacion: cotizacionGuardada,
          banco: bankName,
          comprobanteUrl: fileUrl,
          estado: "pendiente",
          createdAt: new Date().toISOString()
        });"""

    dist_replacement = """        // Guardar solicitud de distribuidor
        await addDoc(collection(db, "solicitudes_distribuidores"), {
          userId: currentUser.uid,
          userEmail: currentUser.email,
          userName: userData?.displayName || userData?.firstName || currentUser.email,
          tipo: isPlan ? "adquisicion_plan" : isRecharge ? "recarga_billetera" : "compra_claves_extras",
          planId: isPlan ? item.id : null,
          planName: isPlan ? item.name : null,
          extraCount: !isPlan && !isRecharge ? item.count : 0,
          itemTitle: title,
          montoCLP: amount,
          cotizacion: cotizacionGuardada,
          banco: bankName,
          comprobanteUrl: fileUrl,
          estado: "pendiente",
          createdAt: new Date().toISOString()
        });

        // Notificar al bot de Telegram del Administrador
        notifyNewDistributorRequest({
          userName: userData?.displayName || userData?.firstName || currentUser.email,
          userEmail: currentUser.email,
          tipo: isPlan ? "adquisicion_plan" : isRecharge ? "recarga_billetera" : "compra_claves_extras",
          planName: isPlan ? item.name : null,
          extraCount: !isPlan && !isRecharge ? item.count : 0,
          montoCLP: amount,
          metodoPago: paymentMethod,
          banco: bankName,
          comprobanteUrl: fileUrl
        }).catch((e) => console.error("Error enviando alerta telegram distribuidor:", e));"""

    if dist_target in content_dist:
        content_dist = content_dist.replace(dist_target, dist_replacement, 1)
        with open(path_dist, "w", encoding="utf-8") as f:
            f.write(content_dist)
        print("PortalDistribuidor.js patched with Telegram notification!")
    else:
        print("Warning: dist_target not found in PortalDistribuidor.js")
else:
    print("PortalDistribuidor.js already has notifyNewDistributorRequest")


# ==============================================================================
# 4. PATCH AdminRevendedores.js (Revocar Rol de Revendedor)
# ==============================================================================
path_rev = r"c:\Users\Usuario\proyectopandastore20\src\pages\Admin\AdminRevendedores.js"
with open(path_rev, "r", encoding="utf-8") as f:
    content_rev = f.read()

# 4.1 Add UserX to lucide-react
if "UserX" not in content_rev:
    content_rev = content_rev.replace("TrendingUp\n} from \"lucide-react\";", "TrendingUp,\n  UserX\n} from \"lucide-react\";")
    print("Added UserX import to AdminRevendedores.js")

# 4.2 Add handleRevocarRevendedor function
if "handleRevocarRevendedor" not in content_rev:
    revoke_handler = """  // Revocar rol de revendedor (quitar rol y regresar a cliente)
  const handleRevocarRevendedor = async (rev) => {
    if (!rev) return;
    const confirmMsg = `¿Estás seguro de REVOCAR el rol de Revendedor a ${rev.displayName || rev.email}?\\n\\n• Su cuenta volverá a tener rol de Cliente regular.\\n• Perderá el acceso mayorista B2B.\\n• Su saldo actual (${formatCLP(rev.wallet_balance || 0)}) se mantendrá en su billetera.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      // 1. Actualizar usuario en users
      await updateDoc(doc(db, "users", rev.id), {
        role: "cliente",
        resellerStatus: "revocado",
        isReseller: false,
        b2b_access: false,
        revocado_el: new Date().toISOString(),
        revocado_por: user?.email || "admin"
      });

      // 2. Actualizar estado en solicitudes_revendedores si existe
      try {
        const solSnap = await getDocs(query(collection(db, "solicitudes_revendedores"), where("userId", "==", rev.id)));
        for (const sDoc of solSnap.docs) {
          await updateDoc(doc(db, "solicitudes_revendedores", sDoc.id), {
            estado: "revocada",
            revocadaAt: new Date().toISOString(),
            revocadaPor: user?.email || "admin"
          });
        }
      } catch (subErr) {
        // Silently ignore if not found
      }

      alert(`✅ Se ha revocado el rol de revendedor a ${rev.email}. Su cuenta ha vuelto a ser Cliente regular.`);
      loadRevendedores();
    } catch (err) {
      console.error("Error al revocar rol:", err);
      alert("Error al revocar rol de revendedor: " + err.message);
    }
  };

  // Rechazar solicitud"""

    content_rev = content_rev.replace("  // Rechazar solicitud", revoke_handler, 1)
    print("Added handleRevocarRevendedor to AdminRevendedores.js")

# 4.3 Add button in Revendedores Activos table
button_target = """                        <button
                          type="button"
                          onClick={() => setSelectedUserForOrders(rev)}
                          style={{
                            background: "rgba(162, 89, 255, 0.15)",
                            border: "1px solid rgba(162, 89, 255, 0.4)",
                            color: "#c084fc",
                            borderRadius: 8,
                            padding: "6px 12px",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6
                          }}
                          title="Ver todas las compras y reembolsar saldo"
                        >
                          <ShoppingBag size={14} /> Ver Compras
                        </button>
                      </div>"""

button_replacement = """                        <button
                          type="button"
                          onClick={() => setSelectedUserForOrders(rev)}
                          style={{
                            background: "rgba(162, 89, 255, 0.15)",
                            border: "1px solid rgba(162, 89, 255, 0.4)",
                            color: "#c084fc",
                            borderRadius: 8,
                            padding: "6px 12px",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6
                          }}
                          title="Ver todas las compras y reembolsar saldo"
                        >
                          <ShoppingBag size={14} /> Ver Compras
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevocarRevendedor(rev)}
                          style={{
                            background: "rgba(239, 68, 68, 0.14)",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            color: "#f87171",
                            borderRadius: 8,
                            padding: "6px 12px",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6
                          }}
                          title="Revocar rol de revendedor y regresar a cliente regular"
                        >
                          <UserX size={14} /> Revocar Rol
                        </button>
                      </div>"""

if button_target in content_rev:
    content_rev = content_rev.replace(button_target, button_replacement, 1)
    print("Added Revocar Rol button to table in AdminRevendedores.js")
else:
    print("Warning: button_target not found in AdminRevendedores.js")

with open(path_rev, "w", encoding="utf-8") as f:
    f.write(content_rev)

print("All patches completed successfully!")
