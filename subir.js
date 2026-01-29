const admin = require("firebase-admin");
const fs = require("fs");
const csv = require("csv-parser");

// --- CONFIGURACIÓN ---
const serviceAccount = require("./credencial.json");
const ARCHIVO_CSV = "datos.csv";
const COLECCION = "base_datos_fen";

// Iniciar Firebase
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} catch (e) {
  // Si ya estaba iniciada, ignoramos el error
}

const db = admin.firestore();

async function subirDatos() {
  const batch = db.batch();
  let contador = 0;
  let total = 0;

  console.log("🚀 Leyendo datos.csv...");

  fs.createReadStream(ARCHIVO_CSV)
    .pipe(csv())
    .on("data", (row) => {
      // 1. LIMPIEZA DE LLAVES (Truco para evitar errores de mayúsculas/minúsculas)
      // Convertimos todas las llaves del CSV a minúsculas para encontrarlas fácil
      const rowLimpia = {};
      Object.keys(row).forEach(key => {
        rowLimpia[key.trim().toLowerCase()] = row[key];
      });

      // 2. BUSCAR EL CORREO (ID)
      // Buscamos columnas comunes como 'correo', 'email', 'correo_personal' o la primera columna
      const email = rowLimpia['correo'] || rowLimpia['email'] || rowLimpia['correo_personal'] || Object.values(rowLimpia)[0];

      if (email && email.includes("@")) {
        const id = email.trim().toLowerCase();
       
        // 3. MAPEO MANUAL (Aquí evitamos el error de columna vacía)
        // Solo guardamos lo que explícitamente nombramos aquí.
        const datosAGuardar = {
            usuario:               rowLimpia['usuario'] || "",
            nombre_completo:       rowLimpia['nombre_completo'] || rowLimpia['nombre completo'] || "",
            nombre:                rowLimpia['nombre'] || "",
            apellido:              rowLimpia['apellido'] || "",
            rut:                   rowLimpia['rut'] || "",
            sexo:                  rowLimpia['sexo'] || "",
            generacion:            rowLimpia['generacion'] || rowLimpia['generación'] || "",
            carrera:               rowLimpia['carrera'] || "",
            telefono:              rowLimpia['telefono'] || rowLimpia['teléfono'] || "",
            situacion:             rowLimpia['situacion'] || rowLimpia['situación'] || "",
            etapa:                 rowLimpia['etapa'] || "",
            nombre_emprendimiento: rowLimpia['nombre_emprendimiento'] || rowLimpia['marca'] || "",
            descripcion:           rowLimpia['descripcion'] || rowLimpia['descripción'] || "",
            programa:              rowLimpia['programa'] || "",
           
            // Metadatos extra
            correo_personal:       id,
            fecha_carga:           new Date()
        };

        // Preparamos la subida
        const docRef = db.collection(COLECCION).doc(id);
        batch.set(docRef, datosAGuardar);
       
        contador++;
        total++;

        // Subir cada 400 registros para no saturar
        if (contador >= 400) {
           batch.commit().then(() => process.stdout.write(".")); // Pone un puntito por cada lote
           contador = 0;
        }
      }
    })
    .on("end", async () => {
      if (contador > 0) await batch.commit();
      console.log(`\n✅ ¡ÉXITO TOTAL! Se subieron ${total} personas a Firebase.`);
    });
}

subirDatos();