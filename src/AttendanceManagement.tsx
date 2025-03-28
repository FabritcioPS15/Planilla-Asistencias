import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileUp, 
  FileDown, 
  X, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  Calendar, 
  User, 
  Clock, 
  AlertCircle, 
  DollarSign, 
  Filter 
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface Empleado {
  Codigo: string;
  Nombre: string;
  Dni: string;
  Cargo: string;
  SueldoMensual: number;
  SueldoDiario: number;
  Dias: Record<string, string>;
  Puntuales: number;
  Tardanzas: number;
  Faltas: number;
  Descuentos: number;
  DiasExtras?: number;
  SueldoFinal: number;
  ArchivoOrigen: string;
  Mes: string;
}

const AttendanceManagement: React.FC = () => {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [diasDelMes, setDiasDelMes] = useState<number>(28);
  const [descuentoTardanza, setDescuentoTardanza] = useState<number>(5);
  const [archivosCargados, setArchivosCargados] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMes, setFilterMes] = useState<string>('TODOS');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(10);

  // Resetear a la primera página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterMes]);

  // Extraer meses únicos para el filtro
  const mesesDisponibles = useMemo(() => {
    const meses = Array.from(new Set(empleados.map(e => e.Mes)));
    return ['TODOS', ...meses];
  }, [empleados]);

  const procesarArchivo = (file: File, nombreArchivo: string) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        let mes = 'SIN MES';
        for (let i = 0; i < 5; i++) {
          if (jsonData[i] && jsonData[i].join('').includes('MES DE')) {
            const mesRow = jsonData[i].join(' ');
            mes = mesRow.replace(/.*MES DE/i, '').replace(/\d+/g, '').trim();
            break;
          }
        }

        const headerRowIndex = jsonData.findIndex(row => row[0] === 'Codigo');
        if (headerRowIndex === -1) throw new Error('Formato de archivo incorrecto');

        const diasCount = jsonData[headerRowIndex]
          .filter((cell: any) => typeof cell === 'string' && cell.startsWith('Dia'))
          .length;
        setDiasDelMes(prev => Math.max(prev, diasCount));

        const nuevosEmpleados: Empleado[] = [];
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || !row[0]) break;

          const dias: Record<string, string> = {};
          let puntuales = 0;
          let tardanzas = 0;
          let faltas = 0;

          for (let d = 1; d <= diasCount; d++) {
            const diaKey = `Dia${d}`;
            const estado = row[6 + d - 1]?.toString() || 'NL';
            dias[diaKey] = estado;
            
            if (estado === 'PU') puntuales++;
            if (estado === 'TA') tardanzas++;
            if (estado === 'FA') faltas++;
          }

          const sueldoDiario = Number(row[5]) || 0;
          const descuentos = (tardanzas * descuentoTardanza) + (faltas * sueldoDiario);
          const sueldoFinal = (Number(row[4]) || 0) - descuentos;

          nuevosEmpleados.push({
            Codigo: row[0]?.toString() || '',
            Nombre: row[1]?.toString() || '',
            Dni: row[2]?.toString() || '',
            Cargo: row[3]?.toString() || '',
            SueldoMensual: Number(row[4]) || 0,
            SueldoDiario: sueldoDiario,
            Dias: dias,
            Puntuales: puntuales,
            Tardanzas: tardanzas,
            Faltas: faltas,
            Descuentos: descuentos,
            DiasExtras: 0,
            SueldoFinal: sueldoFinal,
            ArchivoOrigen: nombreArchivo,
            Mes: mes
          });
        }

        setEmpleados(prev => [...prev, ...nuevosEmpleados]);
        setArchivosCargados(prev => [...prev, nombreArchivo]);
      } catch (error) {
        console.error('Error al procesar el archivo:', error);
        alert(`Error al procesar ${nombreArchivo}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      procesarArchivo(files[i], files[i].name);
    }
    e.target.value = '';
  };

  const handleRemoveFile = (nombreArchivo: string) => {
    setEmpleados(prev => prev.filter(emp => emp.ArchivoOrigen !== nombreArchivo));
    setArchivosCargados(prev => prev.filter(archivo => archivo !== nombreArchivo));
  };

  const handleDayChange = (codigo: string, dia: number, valor: string) => {
    setEmpleados(prev => prev.map(emp => {
      if (emp.Codigo === codigo) {
        const oldEstado = emp.Dias[`Dia${dia}`];
        const newDias = { ...emp.Dias, [`Dia${dia}`]: valor };
        
        let puntuales = emp.Puntuales;
        let tardanzas = emp.Tardanzas;
        let faltas = emp.Faltas;
        let diasExtras = emp.DiasExtras || 0;

        if (oldEstado === 'PU' || oldEstado === 'AS') puntuales--;
        if (oldEstado === 'TA') tardanzas--;
        if (oldEstado === 'FA') faltas--;
        if (oldEstado === 'DE') diasExtras--;

        if (valor === 'PU' || valor === 'AS') puntuales++;
        if (valor === 'TA') tardanzas++;
        if (valor === 'FA') faltas++;
        if (valor === 'DE') diasExtras++;

        const descuentos = (tardanzas * descuentoTardanza) + (faltas * emp.SueldoDiario);
        const sueldoFinal = emp.SueldoMensual - descuentos + (diasExtras * emp.SueldoDiario);

        return { 
          ...emp, 
          Dias: newDias,
          Puntuales: puntuales,
          Tardanzas: tardanzas,
          Faltas: faltas,
          Descuentos: descuentos,
          SueldoFinal: sueldoFinal,
          DiasExtras: diasExtras
        };
      }
      return emp;
    }));
  };

  // Filtrado combinado (búsqueda y mes)
  const empleadosFiltrados = useMemo(() => {
    return empleados.filter(emp => {
      const matchesSearch = 
        emp.Codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.Dni.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.Cargo.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMes = filterMes === 'TODOS' || emp.Mes === filterMes;
      
      return matchesSearch && matchesMes;
    });
  }, [empleados, searchTerm, filterMes]);

  // Lógica de paginación
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = empleadosFiltrados.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(empleadosFiltrados.length / recordsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const handleExport = () => {
    // Obtener información de archivos únicos
    const archivosOrigen = Array.from(new Set(empleados.map(e => e.ArchivoOrigen)));
    const meses = Array.from(new Set(empleados.map(e => e.Mes))).join(', ');
    
    // Estilos para celdas
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4F81BD" } },
      alignment: { horizontal: "center" }
    };
    
    const titleStyle = {
      font: { bold: true, size: 16, color: { rgb: "1F497D" } },
      alignment: { horizontal: "center" }
    };
    
    const footerStyle = {
      font: { italic: true, color: { rgb: "7F7F7F" } }
    };
    
    const totalStyle = {
      font: { bold: true, color: { rgb: "000000" } },
      fill: { fgColor: { rgb: "F2F2F2" } }
    };
  
    // Datos para la hoja detallada
    const wsData = [
      // Título principal
      [{ v: "PLANILLA DETALLADA DE ASISTENCIAS", t: "s", s: titleStyle }],
      // Información de origen
      ["Fuente de datos:", { v: archivosOrigen.join(', '), t: "s" }],
      ["Meses:", { v: meses, t: "s" }],
      ["Descuento por tardanza:", { v: `S/${descuentoTardanza.toFixed(2)}`, t: "s" }],
      [], // Espacio en blanco
      
      // Encabezados con estilo
      [
        { v: "Codigo", s: headerStyle },
        { v: "Empleado", s: headerStyle },
        { v: "Dni", s: headerStyle },
        { v: "Cargo", s: headerStyle },
        { v: "Sueldo Mensual", s: headerStyle },
        { v: "Sueldo Diario", s: headerStyle },
        ...Array.from({length: diasDelMes}, (_, i) => ({ 
          v: `Dia${i + 1}`, 
          s: headerStyle 
        })),
        { v: "Puntual", s: headerStyle },
        { v: "Tardanza", s: headerStyle },
        { v: "Faltas", s: headerStyle },
        { v: "Descuentos", s: headerStyle },
        { v: "Sueldo Final", s: headerStyle },
        { v: "Mes", s: headerStyle },
        { v: "Archivo Origen", s: headerStyle }
      ],
      
      // Datos de empleados
      ...empleadosFiltrados.map(emp => [
        emp.Codigo,
        emp.Nombre,
        emp.Dni,
        emp.Cargo,
        { v: emp.SueldoMensual.toFixed(2), t: "n" },
        { v: emp.SueldoDiario.toFixed(2), t: "n" },
        ...Array.from({length: diasDelMes}, (_, i) => {
          const valor = emp.Dias[`Dia${i + 1}`] || 'NL';
          let color = "000000"; // Negro por defecto
          
          // Colores condicionales para los días
          if (valor === 'PU') color = "00B050"; // Verde
          else if (valor === 'TA') color = "FF0000"; // Rojo
          else if (valor === 'FA') color = "C00000"; // Rojo oscuro
          else if (valor === 'NL') color = "7F7F7F"; // Gris
          
          return { 
            v: valor, 
            s: { font: { color: { rgb: color } } } 
          };
        }),
        { v: emp.Puntuales, t: "n", s: { font: { color: { rgb: "00B050" } } } },
        { v: emp.Tardanzas, t: "n", s: { font: { color: { rgb: "FF0000" } } } },
        { v: emp.Faltas, t: "n", s: { font: { color: { rgb: "C00000" } } } },
        { v: emp.Descuentos.toFixed(2), t: "n", s: { font: { color: { rgb: "FF0000" } } } },
        { v: emp.SueldoFinal.toFixed(2), t: "n", s: { font: { bold: true } } },
        emp.Mes,
        emp.ArchivoOrigen
      ]),
      
      [], // Espacio en blanco
      
      // Leyenda con estilos
      [
        { v: "PU = Puntual", s: footerStyle }, "",
        { v: "TA = Tardanza (-S/.5)", s: { ...footerStyle, font: { color: { rgb: "FF0000" } } } }, "",
        { v: "FA = Falta (-1 día de sueldo)", s: { ...footerStyle, font: { color: { rgb: "C00000" } } } }, "",
        { v: "NL = No Laborable", s: footerStyle }
      ],
      [
        { v: "AS = Asistió", s: footerStyle }, "",
        { v: "DM = Descanso Médico", s: footerStyle }, "",
        { v: "PE = Permiso", s: footerStyle }, "",
        { v: "VA = Vacaciones", s: footerStyle }
      ],
      [
        { v: "DE = Día Extra", s: footerStyle }, "",
        { v: "JU = Justificado", s: footerStyle }, "",
        { v: `Exportado desde: ${archivosOrigen.join(', ')}`, s: { ...footerStyle, font: { italic: true } } }
      ]
    ];
  
    // Datos para la hoja de resumen
    const wsResumenData = [
      // Título
      [{ v: "RESUMEN DE PAGOS", s: titleStyle }],
      // Información
      ["", { v: `MESES: ${meses}`, s: { font: { bold: true } } }],
      ["", { v: `Fuente de datos: ${archivosOrigen.join(', ')}`, s: { font: { italic: true } } }],
      ["", { v: `Descuento por tardanza: S/${descuentoTardanza.toFixed(2)}`, s: { font: { color: { rgb: "FF0000" } } } }],
      [], // Espacio en blanco
      
      // Encabezados
      [
        { v: "Empleado", s: headerStyle },
        { v: "DNI", s: headerStyle },
        { v: "Sueldo Mensual", s: headerStyle },
        { v: "Descuentos", s: headerStyle },
        { v: "Sueldo Final", s: headerStyle },
        { v: "Archivo Origen", s: headerStyle }
      ],
      
      // Datos
      ...empleadosFiltrados.map(emp => [
        emp.Nombre,
        emp.Dni,
        { v: emp.SueldoMensual.toFixed(2), t: "n" },
        { v: emp.Descuentos.toFixed(2), t: "n", s: { font: { color: { rgb: "FF0000" } } } },
        { v: emp.SueldoFinal.toFixed(2), t: "n", s: { font: { bold: true } } },
        emp.ArchivoOrigen
      ]),
      
      [], // Espacio en blanco
      
      // Totales
      [
        { v: "TOTALES", s: totalStyle }, "",
        { 
          v: empleadosFiltrados.reduce((sum, emp) => sum + emp.SueldoMensual, 0).toFixed(2), 
          t: "n", 
          s: totalStyle 
        },
        { 
          v: empleadosFiltrados.reduce((sum, emp) => sum + emp.Descuentos, 0).toFixed(2), 
          t: "n", 
          s: { ...totalStyle, font: { color: { rgb: "FF0000" } } } 
        },
        { 
          v: empleadosFiltrados.reduce((sum, emp) => sum + emp.SueldoFinal, 0).toFixed(2), 
          t: "n", 
          s: { ...totalStyle, font: { color: { rgb: "00B050" } } } 
        },
        ""
      ],
      
      // Pie de página
      [],
      [
        { v: `Documento generado el: ${new Date().toLocaleString()}`, s: footerStyle }, "",
        { v: `Fuente: ${archivosOrigen.join(', ')}`, s: footerStyle }
      ]
    ];
  
    // Crear las hojas de trabajo
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wsResumen = XLSX.utils.aoa_to_sheet(wsResumenData);
  
    // Aplicar anchos de columnas
    const colWidths = [
      { wch: 8 },  // Código
      { wch: 40 }, // Nombre
      { wch: 10 }, // DNI
      { wch: 30 }, // Cargo
      { wch: 15 }, // Sueldo Mensual
      { wch: 15 }, // Sueldo Diario
      ...Array(diasDelMes).fill({ wch: 5 }), // Días
      { wch: 8 },  // Puntual
      { wch: 8 },  // Tardanza
      { wch: 8 },  // Faltas
      { wch: 12 }, // Descuentos
      { wch: 12 }, // Sueldo Final
      { wch: 10 }, // Mes
      { wch: 60 }  // Archivo Origen
    ];
    ws['!cols'] = colWidths;
    
    const resumenColWidths = [
      { wch: 40 }, // Nombre
      { wch: 12 }, // DNI
      { wch: 15 }, // Sueldo Mensual
      { wch: 15 }, // Descuentos
      { wch: 15 }, // Sueldo Final
      { wch: 60 }  // Archivo Origen
    ];
    wsResumen['!cols'] = resumenColWidths;
  
    // Crear el libro y añadir las hojas
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle Asistencias');
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Pagos');
    
    // Generar nombre de archivo con timestamp legible
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, -5);
    
    XLSX.writeFile(wb, `Planilla_Consolidada_${meses.replace(/, /g, '-')}_${timestamp}.xlsx`);
  };
  const leyendaEstados = [
    { codigo: 'PU', significado: 'Puntual', color: 'bg-green-100 text-green-800 border-green-200' },
    { codigo: 'TA', significado: `Tardanza (-S/.${descuentoTardanza})`, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { codigo: 'FA', significado: 'Falta (-1 día de sueldo)', color: 'bg-red-100 text-red-800 border-red-200' },
    { codigo: 'NL', significado: 'No Laborable', color: 'bg-gray-100 text-gray-800 border-gray-200' },
    { codigo: 'AS', significado: 'Asistió', color: 'bg-green-200 text-green-800 border-green-300' },
    { codigo: 'DM', significado: 'Descanso Médico', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { codigo: 'PE', significado: 'Permiso', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    { codigo: 'VA', significado: 'Vacaciones', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
    { codigo: 'DE', significado: 'Día Extra', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    { codigo: 'JU', significado: 'Justificado', color: 'bg-lime-100 text-lime-800 border-lime-200' }
  ];

  // Estilos reutilizables
  const buttonStyle = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium";
  const primaryButtonStyle = `${buttonStyle} bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg`;
  const successButtonStyle = `${buttonStyle} bg-green-600 text-white hover:bg-green-700 shadow-md`;
  const dangerButtonStyle = `${buttonStyle} bg-red-600 text-white hover:bg-red-700 shadow-md`;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto">
      {/* Encabezado principal */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Calendar className="text-green-600" size={28} />
          Gestión de Asistencias
        </h1>
        <p className="text-gray-600 mt-2">Registro y control de asistencia del personal</p>
      </div>

      {/* Panel de control */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
        {/* Barra superior con estadísticas */}
        <div className="bg-gradient-to-r from-green-600 to-green-800 p-4 text-white">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold">Planilla Consolidada</h2>
              <p className="text-blue-100">
                {empleados.length > 0 
                  ? `${empleados.length} empleados registrados` 
                  : 'No hay datos cargados'}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Clock className="text-blue-200" size={18} />
                  <span className="font-medium">Tardanza:</span>
                  <span>- S/.{descuentoTardanza.toFixed(2)}</span>
                </div>
              </div>
              <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-blue-200" size={18} />
                  <span className="font-medium">Falta:</span>
                  <span>1 día de sueldo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controles principales */}
        <div className="p-6">
          <div className="flex flex-wrap justify-between gap-6 mb-6">
            {/* Filtros y búsqueda */}
            <div className="flex-1 min-w-[300px] space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="text-gray-400" size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nombre, DNI o cargo..."
                  className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter className="text-gray-400" size={18} />
                  </div>
                  <select
                    className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                    value={filterMes}
                    onChange={(e) => setFilterMes(e.target.value)}
                  >
                    {mesesDisponibles.map((mes, index) => (
                      <option key={index} value={mes}>
                        {mes === 'TODOS' ? 'Todos los meses' : mes}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex-1 min-w-[200px]">
                  <select
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={recordsPerPage}
                    onChange={(e) => {
                      setRecordsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value="5">5 registros/página</option>
                    <option value="10">10 registros/página</option>
                    <option value="20">20 registros/página</option>
                    <option value="50">50 registros/página</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImport}
                  className="hidden"
                  id="attendance-import"
                  multiple
                />
                <label
                  htmlFor="attendance-import"
                  className={`${primaryButtonStyle} min-w-[180px]`}
                >
                  <FileUp size={18} /> Importar Excel
                </label>
                <button
                  onClick={handleExport}
                  className={`${successButtonStyle} ${empleados.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={empleados.length === 0}
                >
                  <FileDown size={18} /> Exportar Excel
                </button>
              </div>

              {archivosCargados.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <User size={16} />
                      Archivos cargados ({archivosCargados.length})
                    </h4>
                    <span className="text-sm text-gray-500">
                      {empleados.length} registros
                    </span>
                  </div>
                  <div className="max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {archivosCargados.map((archivo, index) => (
                      <div 
                        key={index} 
                        className="flex justify-between items-center py-1.5 px-2 hover:bg-gray-100 rounded"
                      >
                        <span className="text-sm truncate max-w-[220px]" title={archivo}>
                          {archivo}
                        </span>
                        <button 
                          onClick={() => handleRemoveFile(archivo)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                          title="Eliminar archivo"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Leyenda */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="text-blue-600">Leyenda de Estados</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {leyendaEstados.map((item) => (
                <div 
                  key={item.codigo} 
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 ${item.color} border`}
                >
                  <span className="font-bold">{item.codigo}</span>
                  <span className="text-sm">{item.significado}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de datos */}
      {empleadosFiltrados.length > 0 ? (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Encabezado de la tabla */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <div className="text-sm text-gray-600">
              Mostrando <span className="font-medium">{indexOfFirstRecord + 1}-{Math.min(indexOfLastRecord, empleadosFiltrados.length)}</span> de <span className="font-medium">{empleadosFiltrados.length}</span> registros
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-3 py-1 bg-white border border-gray-300 rounded-md text-sm">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Contenedor de la tabla con scroll */}
          <div className="relative">
            {/* Indicador de scroll para móviles */}
            <div className="md:hidden text-center py-3 bg-blue-50">
              <div className="inline-flex items-center text-sm text-blue-600 animate-pulse">
                <ArrowRight className="w-4 h-4 mr-1" />
                Desliza horizontalmente para ver más días
              </div>
            </div>

            {/* Tabla con scroll horizontal */}
            <div 
              className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
              style={{ maxHeight: 'calc(100vh - 400px)' }}
            >
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0 z-20">
                  <tr>
                    {/* Columnas fijas a la izquierda */}
                    <th className="sticky left-0 z-30 bg-gray-100 p-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Código</th>
                    <th className="sticky left-16 z-30 bg-gray-100 p-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Empleado</th>
                    <th className="sticky left-40 z-30 bg-gray-100 p-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">DNI</th>
                    <th className="left-52 z-30 bg-gray-100 p-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Sueldo Mensual</th>
                    <th className="left-80 z-30 bg-gray-100 p-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Sueldo Diario</th>
                    
                    {/* Columnas de días con scroll horizontal */}
                    {Array.from({length: diasDelMes}, (_, i) => (
                      <th 
                        key={`dia-${i}`}
                        className="p-3 text-center text-sm font-semibold text-gray-700 whitespace-nowrap bg-blue-50 min-w-[50px]"
                      >
                        {i + 1}
                      </th>
                    ))}
                    
                    {/* Columnas de resumen */}
                    <th className="p-3 text-center text-sm font-semibold text-gray-700 whitespace-nowrap bg-green-50">Punt.</th>
                    <th className="p-3 text-center text-sm font-semibold text-gray-700 whitespace-nowrap bg-yellow-50">Tard.</th>
                    <th className="p-3 text-center text-sm font-semibold text-gray-700 whitespace-nowrap bg-red-50">Faltas</th>
                    <th className="p-3 text-center text-sm font-semibold text-gray-700 whitespace-nowrap bg-orange-50">Desc.</th>
                    <th className="p-3 text-center text-sm font-semibold text-gray-700 whitespace-nowrap bg-blue-100">Total</th>
                    <th className="p-3 text-center text-sm font-semibold text-gray-700 whitespace-nowrap bg-gray-100">Mes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentRecords.map((emp, empIndex) => (
                    <tr 
                      key={`${emp.Codigo}-${empIndex}`} 
                      className="hover:bg-gray-50 even:bg-gray-50/50"
                    >
                      {/* Columnas fijas */}
                      <td className="sticky left-0 z-20 bg-white p-2 font-mono text-sm text-left border-r border-gray-200">
                        {emp.Codigo}
                      </td>
                      <td className="sticky left-14 z-20 bg-white p-2 max-w-[180px] text-medium border-r border-gray-200">
                        <div className="font-medium">{emp.Nombre}</div>
                        <div className="text-xs text-gray-500">{emp.Cargo}</div>
                      </td>
                      <td className="sticky left-40 z-20 bg-white p-3 font-mono text-sm text-right border-r border-gray-200">
                        {emp.Dni}
                      </td>
                                      {/* Columnas de sueldo */}
                <td className="left-60 z-20 bg-white p-3 font-mono text-sm text-left border-r border-l border-gray-200">
                  S/.{emp.SueldoMensual.toFixed(2)}
                </td>
                <td className="left-80 z-20 bg-white p-3 font-mono text-sm text-left border-r border-gray-200">
                  S/.{emp.SueldoDiario.toFixed(2)}
                </td>
                      {/* Celdas de días */}
                      {Array.from({length: diasDelMes}, (_, i) => {
                        const estado = emp.Dias[`Dia${i + 1}`] || 'NL';
                        const estadoConfig = leyendaEstados.find(e => e.codigo === estado);
                        return (
                          <td key={i} className="p-1">
                            <select
                              value={estado}
                              onChange={(e) => handleDayChange(emp.Codigo, i + 1, e.target.value)}
                              className={`w-full p-1.5 text-center rounded border text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                estadoConfig?.color || 'bg-gray-50'
                              }`}
                            >
                              {leyendaEstados.map(item => (
                                <option key={item.codigo} value={item.codigo}>{item.codigo}</option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                      
                      {/* Celdas de resumen */}
                      <td className="p-3 text-center bg-green-50 text-green-800 font-medium">
                        {emp.Puntuales}
                      </td>
                      <td className="p-3 text-center bg-yellow-50 text-yellow-800 font-medium">
                        {emp.Tardanzas}
                      </td>
                      <td className="p-3 text-center bg-red-50 text-red-800 font-medium">
                        {emp.Faltas}
                      </td>
                      <td className="p-3 text-center bg-orange-50 text-orange-800 font-mono text-sm">
                        S/.{emp.Descuentos.toFixed(2)}
                      </td>
                      <td className="p-3 text-center bg-blue-100 text-blue-900 font-mono font-bold">
                        S/.{emp.SueldoFinal.toFixed(2)}
                      </td>
                      <td className="p-3 text-center bg-gray-100 text-sm">
                        {emp.Mes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginación inferior */}
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50">
            <div className="text-sm text-gray-600">
              Mostrando {indexOfFirstRecord + 1}-{Math.min(indexOfLastRecord, empleadosFiltrados.length)} de {empleadosFiltrados.length} registros
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => paginate(1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
              >
                «
              </button>
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
              >
                ‹
              </button>
              
              {/* Mostrar números de página con elipsis para muchas páginas */}
              {(() => {
                const pages = [];
                const maxVisiblePages = 5;
                
                if (totalPages <= maxVisiblePages) {
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  const leftOffset = Math.floor(maxVisiblePages / 2);
                  const rightOffset = Math.ceil(maxVisiblePages / 2) - 1;
                  
                  let startPage = currentPage - leftOffset;
                  let endPage = currentPage + rightOffset;
                  
                  if (startPage < 1) {
                    startPage = 1;
                    endPage = maxVisiblePages;
                  }
                  
                  if (endPage > totalPages) {
                    endPage = totalPages;
                    startPage = totalPages - maxVisiblePages + 1;
                  }
                  
                  if (startPage > 1) pages.push(1, '...');
                  for (let i = startPage; i <= endPage; i++) pages.push(i);
                  if (endPage < totalPages) pages.push('...', totalPages);
                }
                
                return pages.map((page, index) => (
                  <button
                    key={index}
                    onClick={() => typeof page === 'number' ? paginate(page) : null}
                    disabled={page === '...'}
                    className={`min-w-[36px] p-2 rounded-md ${
                      page === currentPage 
                        ? 'bg-blue-600 text-white' 
                        : page === '...' 
                          ? 'bg-transparent cursor-default' 
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ));
              })()}
              
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
              >
                ›
              </button>
              <button
                onClick={() => paginate(totalPages)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
              >
                »
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden py-12 text-center">
          <div className="max-w-md mx-auto">
            {empleados.length > 0 ? (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                  <Search className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron resultados</h3>
                <p className="text-gray-500 mb-6">
                  No hay coincidencias para tu búsqueda. Intenta con otros términos.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterMes('TODOS');
                  }}
                  className={`${primaryButtonStyle} inline-flex`}
                >
                  Limpiar filtros
                </button>
              </>
            ) : (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                  <FileUp className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos cargados</h3>
                <p className="text-gray-500 mb-6">
                  Importa archivos Excel para comenzar a gestionar las asistencias.
                </p>
                <label
                  htmlFor="attendance-import"
                  className={`${primaryButtonStyle} inline-flex`}
                >
                  <FileUp size={18} /> Importar archivos Excel
                </label>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceManagement;