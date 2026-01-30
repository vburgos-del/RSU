import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import fs from "fs"; 

// -----------------------------------------------------------
// 🔑 TUS CREDENCIALES
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
const NOMBRE_COLECCION = "base_datos_fen"; 

// --- 🛠️ FUNCIÓN AYUDANTE: CONVERTIR CSV A JSON ---
function csvToJson(csvText) {
    const lines = csvText.split(/\r?\n/); 
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '')); 
    
    const result = [];
    for(let i = 1; i < lines.length; i++) {
        if(!lines[i].trim()) continue; 
        const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        const currentline = lines[i].split(regex);
        const obj = {};
        headers.forEach((header, index) => {
            let valor = currentline[index] ? currentline[index].trim().replace(/^"|"$/g, '') : "";
            obj[header] = valor;
        });
        result.push(obj);
    }
    return result;
}

// --- 🧹 FUNCIÓN LIMPIEZA ---
const limpiarBaseDeDatos = async () => {
    console.log("🧹 Borrando datos antiguos...");
    const colRef = collection(db, NOMBRE_COLECCION);
    const snapshot = await getDocs(colRef);
    if (!snapshot.empty) {
        const promesas = snapshot.docs.map(d => deleteDoc(doc(db, NOMBRE_COLECCION, d.id)));
        await Promise.all(promesas);
    }
    console.log("✨ Base de datos limpia.");
};

// --- 🚀 FUNCIÓN DE SUBIDA ---
const subirDatos = async () => {
    try {
        await limpiarBaseDeDatos();
        console.log("📂 Leyendo datos.csv...");
        
        const dataRaw = fs.readFileSync("./datos.csv", "utf8");
        const emprendedores = csvToJson(dataRaw); 

        console.log(`🚀 Cargando ${emprendedores.length} registros...`);
        let contExito = 0;

        for (let i = 0; i < emprendedores.length; i++) {
            const item = emprendedores[i];

            // FUNCIÓN PARA BUSCAR TU COLUMNA EXACTA
            // Busca en orden: si no encuentra la primera, busca la segunda...
            const getVal = (keys) => {
                for (let key of keys) {
                    if (item[key] !== undefined) return item[key];
                }
                return "";
            };

            // 1. Nombre
            // Agregamos "nombre-completo" a la lista de búsqueda
            let nombreFull = getVal(["nombre-completo", "Nombre Completo", "nombre"]);
            
            // 2. Estado (Lógica Inteligente)
            let estadoFinal = "Estudiante"; 
            const estadoExcel = getVal(["situacion", "Situacion", "Estado"]).toLowerCase();
            if (estadoExcel.includes("egresado") || estadoExcel.includes("alumni") || estadoExcel.includes("titulado")) {
                estadoFinal = "Egresado";
            }

            const nuevoEmprendedor = {
                usuario_id: getVal(["usuario", "id"]) || "sin-id",
                rut: getVal(["rut", "Rut"]),
                fecha_registro: new Date(),
                
                // DATOS PERSONALES
                nombre_completo: nombreFull,
                nombre: getVal(["nombre", "Nombre"]) || nombreFull.split(" ")[0],
                // Si no hay columna apellido, tomamos lo que sobre del nombre completo
                apellido: nombreFull.split(" ").slice(1).join(" ") || "",
                
                sexo: getVal(["sexo", "Sexo"]) || "No especificado", // ¡Agregado!
                correo_personal: getVal(["correo", "Correo", "email"]),
                telefono: getVal(["telefono", "Telefono", "celular"]),
                
                // DATOS ACADÉMICOS
                facultad: getVal(["facultad", "Facultad"]) || "FEN",
                carrera: getVal(["carrera", "Carrera"]),
                situacion: estadoFinal, 
                // Agregamos "generación" con tilde
                generacion: Number(getVal(["generación", "generacion", "Generacion"])) || 0,

                // DATOS EMPRENDIMIENTO
                nombre_emprendimiento: getVal(["marca", "Marca", "nombre_emprendimiento"]) || "Sin Nombre",
                descripcion: getVal(["descripcion", "Descripcion"]),
                industria: getVal(["industria", "Industria"]) || "General",
                etapa: getVal(["etapa", "Etapa"]) || "Idea",
                programa: getVal(["programa", "Programa"]) || "", // ¡Agregado!
                
                origen: "carga_masiva_csv"
            };

            await addDoc(collection(db, NOMBRE_COLECCION), nuevoEmprendedor);
            contExito++;
            if (i % 20 === 0) console.log(`⏳ Subiendo... ${i}`);
        }
        console.log(`✅ ¡LISTO! ${contExito} registros subidos.`);

    } catch (e) {
        console.error("🔥 Error:", e.message);
    }
};

subirDatos();
