import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import fs from "fs"; 

// -----------------------------------------------------------
// 🔴 ¡REVISA QUE TUS LLAVES DE FIREBASE ESTÉN AQUÍ!
// -----------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDU0DbrhegekpiUCroxhqGLJ-l1Xk2Rfa4",
  authDomain: "emprnd-fen.firebaseapp.com",
  projectId: "emprnd-fen",
  storageBucket: "emprnd-fen.firebasestorage.app",
  messagingSenderId: "130510661023",
  appId: "1:130510661023:web:5358ef6031b6862ff189aa",
  measurementId: "G-W5C8E6SGEY"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const subirDatos = async () => {
    try {
        console.log("📂 Leyendo archivo datos_fen.json...");
        
        // Leemos el archivo
        const dataRaw = fs.readFileSync("./datos_fen.json", "utf8");
        const emprendedores = JSON.parse(dataRaw);

        console.log(`🚀 Iniciando carga de ${emprendedores.length} registros...`);

        let contExito = 0;
        let contError = 0;

        for (let i = 0; i < emprendedores.length; i++) {
            const item = emprendedores[i];

            // Lógica de Nombres
            let nombreFinal = item.nombre;
            let apellidoFinal = item.apellido;
            if ((!nombreFinal || nombreFinal === "") && item.nombre_completo) {
                const partes = item.nombre_completo.split(" ");
                nombreFinal = partes[0]; 
                apellidoFinal = partes.slice(1).join(" ") || ""; 
            }

            // --- AQUÍ ESTÁ EL ARREGLO MÁGICO ⬇️ ---
            // Buscamos 'generacion' O 'generación' (con tilde) O 'Generación'
            const genReal = item.generacion || item.generación || item.Generación || item.Generacion;
            
            const nuevoEmprendedor = {
                usuario_id: item.usuario || "sin-id",
                rut: item.rut || "",
                nombre_completo: item.nombre_completo || `${nombreFinal} ${apellidoFinal}`,
                nombre: nombreFinal || "",
                apellido: apellidoFinal || "",
                sexo: item.sexo || "No especificado",
                
                correo_personal: item.correo || "",
                telefono: item.telefono || "",

                carrera: item.carrera || "",
                
                // Usamos la variable genReal que detectamos arriba
                generacion: Number(genReal) || 0,
                
                situacion_academica: item.situacion || "", 

                nombre_emprendimiento: item.marca || "Sin Nombre",
                descripcion: item.descripcion || "",
                etapa: item.etapa || "",
                programa: item.programa || "",
                
                fecha_registro: new Date(),
                origen: "carga_masiva_excel"
            };

            try {
                await addDoc(collection(db, "base_datos_fen"), nuevoEmprendedor);
                contExito++;
                if (i % 50 === 0) console.log(`✅ Procesados: ${i} / ${emprendedores.length}`);
            } catch (error) {
                console.error(`❌ Error en fila ${i}:`, error.message);
                contError++;
            }
        }
        console.log(`✅ FINALIZADO: ${contExito} subidos correctamente.`);

    } catch (e) {
        console.error("🔥 Error:", e.message);
    }
};

subirDatos();