import React, { useState, useEffect, useCallback } from "react";
import { auth, db, storage } from "../../firebase";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import Cropper from "react-easy-crop";

// Utilidad para crear una imagen desde una URL
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (error) => reject(error));
    img.setAttribute("crossOrigin", "anonymous");
    img.src = url;
  });

// Utilidad para obtener la imagen recortada como un Blob
const getCroppedImgFromFile = async (file, crop) => {
  const image = await createImage(URL.createObjectURL(file));
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("No se pudo recortar la imagen."));
      }
      resolve(blob);
    }, "image/jpeg");
  });
};

export default function EditarPerfil({ user, onUpdate }) {
  const [formData, setFormData] = useState({
    displayName: user.displayName || "",
    phoneNumber: "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
  });
  const [isChanged, setIsChanged] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar datos de Firestore al iniciar el componente
  useEffect(() => {
    let isMounted = true;
    const fetchPhoneNumber = async () => {
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const firestorePhone = userDoc.exists() ? userDoc.data().phoneNumber : "";
        if (isMounted) {
          const data = userDoc.exists() ? userDoc.data() : {};
          setFormData((prevData) => ({
            ...prevData,
            phoneNumber: data.phoneNumber || "",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
          }));
        }
      }
    };
    fetchPhoneNumber();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Manejar el cambio en los campos de texto y verificar si hay cambios
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    setIsChanged(true);
  };

  // Manejar la selección de archivo de imagen
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageToCrop(e.target.files[0]);
    }
  };

  // Guardar la imagen recortada
  const handleCropSave = async () => {
    if (!imageToCrop || !croppedAreaPixels) {
      alert("Por favor, selecciona y ajusta el recorte de la imagen.");
      return;
    }

    setIsLoading(true);
    try {
      const croppedBlob = await getCroppedImgFromFile(imageToCrop, croppedAreaPixels);
      const fileRef = ref(storage, `user_uploads/${user.uid}/profile.jpg`);
      await uploadBytes(fileRef, croppedBlob);
      const url = await getDownloadURL(fileRef);

      // Actualizar el perfil del usuario en Firebase Auth y Firestore
      await updateProfile(auth.currentUser, { photoURL: url });
      await setDoc(doc(db, "users", user.uid), { photoURL: url }, { merge: true });

      // Notificar al componente padre sobre el cambio
      if (onUpdate) onUpdate({ photoURL: url });

      // Limpiar el estado del recorte
      setImageToCrop(null);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    } catch (err) {
      alert("Error al guardar la imagen: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Guardar los datos de nombre y teléfono
  const handleUpdateData = async () => {
    setIsLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName: formData.displayName });
      await setDoc(
        doc(db, "users", user.uid),
        {
          phoneNumber: formData.phoneNumber,
          firstName: formData.firstName,
          lastName: formData.lastName,
        },
        { merge: true }
      );
      if (onUpdate) onUpdate({
        phoneNumber: formData.phoneNumber,
        displayName: formData.displayName,
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      setIsChanged(false);
    } catch (err) {
      console.error("Error al actualizar el perfil:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Cambia esto:
  // const onCropComplete = React.useCallback((croppedArea, croppedAreaPixels) => {
  //   setCroppedAreaPixels(croppedAreaPixels);
  // }, []);

  // Por esto:
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  return (
    <div className="editar-perfil">
      <div className="form-section">
        <label htmlFor="image-upload" className="image-upload-label">
          Cambiar foto de perfil
        </label>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        {imageToCrop && (
          <div className="cropper-modal">
            <div className="cropper-container">
              <Cropper
                image={URL.createObjectURL(imageToCrop)}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: { background: "#333" },
                  cropAreaStyle: { border: "2px solid #fff", borderRadius: "50%" },
                }}
              />
            </div>
            <div className="cropper-actions">
              <button type="button" onClick={() => setImageToCrop(null)} disabled={isLoading}>
                Cancelar
              </button>
              <button type="button" onClick={handleCropSave} disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar Recorte"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="form-section">
        <label htmlFor="firstName">Nombre</label>
        <input
          id="firstName"
          name="firstName"
          type="text"
          value={formData.firstName}
          onChange={handleChange}
          autoComplete="off"
        />
      </div>
      <div className="form-section">
        <label htmlFor="lastName">Apellido</label>
        <input
          id="lastName"
          name="lastName"
          type="text"
          value={formData.lastName}
          onChange={handleChange}
          autoComplete="off"
        />
      </div>

      <div className="form-section">
        <label htmlFor="phoneNumber">Teléfono</label>
        <input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          value={formData.phoneNumber}
          onChange={handleChange}
          placeholder="+56912345678"
          autoComplete="off"
        />
      </div>

      <div className="form-section">
        <label htmlFor="email">Correo</label>
        <input
          id="email"
          name="email"
          type="email"
          value={user.email}
          disabled
        />
      </div>

      <button
        onClick={handleUpdateData}
        disabled={!isChanged || isLoading}
        className="btn-guardar"
      >
        {isLoading ? "Guardando..." : "Guardar Cambios"}
      </button>
    </div>
  );
}