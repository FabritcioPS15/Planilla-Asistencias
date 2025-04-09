import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileUp, FileDown, X, Search, ChevronRight, 
  ArrowRight, Calendar, User, Clock, AlertCircle, 
  DollarSign, Filter, Plus, Minus, BarChart2, Settings, Users 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://aixtoyektrlelzhyxuuc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpeHRveWVrdHJsZWx6aHl4dXVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMxOTcxNDIsImV4cCI6MjA1ODc3MzE0Mn0.T3dk1xfdCs0m1R9CC2lJ1VnNgJOOMwYd7crd7sPJqD8';
const supabase = createClient(supabaseUrl, supabaseKey);

// Interfaces
interface RubroSummary {
  nombre: string;
  cantidadEmpleados: number;
  totalSueldos: number;
  totalDescuentos: number;
  totalBonos: number;
  totalFinal: number;
  color: string;
}

interface OcupacionSummary {
  nombre: string;
  cantidadEmpleados: number;
  totalSueldos: number;
  totalDescuentos: number;
  totalBonos: number;
  totalFinal: number;
  color: string;
}

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
  NombreReporte: string;
  Mes: string;
  TipoPlanilla: 'honorarios' | 'regular';
  Pension: 'AFP' | 'ONP' | 'ninguno';
  BonoExtra: number;
  Sede: string;
  Empresa: string;
  Rubro: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B', '#4ECDC4', '#45B7D1', '#A05195'];

const AttendanceManagement: React.FC = () => {
  // Estados
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [diasDelMes, setDiasDelMes] = useState<number>(28);
  const [descuentoTardanza, setDescuentoTardanza] = useState<number>(5);
  const [archivosCargados, setArchivosCargados] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterReporte, setFilterReporte] = useState<string>('TODOS');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(10);
  const [defaultTipoPlanilla, setDefaultTipoPlanilla] = useState<'honorarios' | 'regular'>('honorarios');
  const [defaultPension, setDefaultPension] = useState<'AFP' | 'ONP'>('AFP');
  const [defaultSede, setDefaultSede] = useState<string>('Lima');
  const [activeTab, setActiveTab] = useState<'asistencias' | 'reportes'>('asistencias');
  const [sedes] = useState<string[]>(['Lima']);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Funciones
  const extraerNombreReporte = (nombreArchivo: string): string => {
    const prefix = "ReportePlanillaResumen_";
    if (nombreArchivo.startsWith(prefix)) {
      return nombreArchivo.slice(prefix.length).replace('.xlsx', '').replace('.xls', '');
    }
    return nombreArchivo;
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterReporte]);

  // Memoized values
  const reportesDisponibles = useMemo(() => {
    const reportes = Array.from(new Set(empleados.map(e => e.NombreReporte)));
    return ['TODOS', ...reportes];
  }, [empleados]);

  const validateEmployee = async (dni: string, nombre: string) => {
    try {
      const { data: dniData, error: dniError } = await supabase
        .from('people')
        .select('dni, nombre, ocupacion, salario, sede, empresa, rubro, activo')
        .eq('dni', dni)
        .eq('activo', true)
        .single();

      if (!dniError && dniData) {
        return { isValid: true, data: dniData };
      }

      const { data: nameData, error: nameError } = await supabase
        .from('people')
        .select('dni, nombre, ocupacion, salario, sede, empresa, rubro, activo')
        .textSearch('nombre', nombre.split(' ').join(' & '))
        .eq('activo', true)
        .single();

      if (!nameError && nameData) {
        return { isValid: true, data: nameData };
      }

      return { 
        isValid: false, 
        error: 'Empleado no encontrado o inactivo en la base de datos' 
      };
    } catch (error) {
      console.error('Error al validar empleado:', error);
      return { isValid: false, error: 'Error al conectar con la base de datos' };
    }
  };

  const calcularSueldoFinal = (emp: Empleado) => {
    const descuentosAsistencia = (emp.Tardanzas * descuentoTardanza) + (emp.Faltas * emp.SueldoDiario);
    
    let descuentoPension = 0;
    if (emp.TipoPlanilla === 'regular') {
      if (emp.Pension === 'AFP') {
        descuentoPension = emp.SueldoMensual * 0.117;
      } else if (emp.Pension === 'ONP') {
        descuentoPension = emp.SueldoMensual * 0.13;
      }
    }
    
    const diasExtrasValor = (emp.DiasExtras || 0) * emp.SueldoDiario;
    const bonoExtra = emp.BonoExtra || 0;
    
    const sueldoFinal = emp.SueldoMensual - descuentosAsistencia - descuentoPension + diasExtrasValor + bonoExtra;
    
    return {
      sueldoFinal: Math.max(0, sueldoFinal),
      descuentoPension,
      descuentosAsistencia,
      diasExtrasValor,
      bonoExtra
    };
  };

  const procesarArchivo = async (file: File, nombreArchivo: string) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      setIsValidating(true);
      setValidationErrors({});
      
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

        const nombreReporte = extraerNombreReporte(nombreArchivo);
        const nuevosEmpleados: Empleado[] = [];
        const errores: Record<string, string> = {};
        
        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || !row[0]) break;

          const dni = row[2]?.toString() || '';
          const nombre = row[1]?.toString() || '';

          const validation = await validateEmployee(dni, nombre);
          
          if (!validation.isValid) {
            errores[dni || `row-${i}`] = validation.error || `Empleado no validado: ${nombre}`;
            continue;
          }

          const empleadoDB = validation.data;

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
          const descuentosAsistencia = (tardanzas * descuentoTardanza) + (faltas * sueldoDiario);
          
          const empleado: Empleado = {
            Codigo: row[0]?.toString() || '',
            Nombre: nombre,
            Dni: dni,
            Cargo: empleadoDB.ocupacion || row[3]?.toString() || '',
            SueldoMensual: empleadoDB.salario || Number(row[4]) || 0,
            SueldoDiario: sueldoDiario,
            Dias: dias,
            Puntuales: puntuales,
            Tardanzas: tardanzas,
            Faltas: faltas,
            Descuentos: descuentosAsistencia,
            DiasExtras: 0,
            SueldoFinal: 0,
            ArchivoOrigen: nombreArchivo,
            NombreReporte: nombreReporte,
            Mes: mes,
            TipoPlanilla: defaultTipoPlanilla,
            Pension: defaultTipoPlanilla === 'regular' ? defaultPension : 'ninguno',
            BonoExtra: 0,
            Sede: empleadoDB.sede || defaultSede,
            Empresa: empleadoDB.empresa || '',
            Rubro: empleadoDB.rubro || ''
          };

          const { sueldoFinal } = calcularSueldoFinal(empleado);
          empleado.SueldoFinal = sueldoFinal;

          nuevosEmpleados.push(empleado);
        }

        setEmpleados(prev => [...prev, ...nuevosEmpleados]);
        setValidationErrors(prev => ({ ...prev, ...errores }));
        setArchivosCargados(prev => [...prev, nombreArchivo]);

        if (Object.keys(errores).length > 0) {
          alert(`Se procesaron ${nuevosEmpleados.length} empleados válidos. ${Object.keys(errores).length} no pasaron validación.`);
        }
      } catch (error) {
        console.error('Error al procesar el archivo:', error);
        alert(`Error al procesar ${nombreArchivo}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      } finally {
        setIsValidating(false);
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
    
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (newErrors[key].includes(nombreArchivo)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });
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

        const empleadoActualizado = {
          ...emp, 
          Dias: newDias,
          Puntuales: puntuales,
          Tardanzas: tardanzas,
          Faltas: faltas,
          DiasExtras: diasExtras
        };

        const { sueldoFinal, descuentosAsistencia } = calcularSueldoFinal(empleadoActualizado);
        
        return {
          ...empleadoActualizado,
          Descuentos: descuentosAsistencia,
          SueldoFinal: sueldoFinal
        };
      }
      return emp;
    }));
  };

  const handleTipoPlanillaChange = (codigo: string, tipo: 'honorarios' | 'regular') => {
    setEmpleados(prev => prev.map(emp => {
      if (emp.Codigo === codigo) {
        const empleadoActualizado = {
          ...emp,
          TipoPlanilla: tipo,
          Pension: tipo === 'honorarios' ? 'ninguno' : (defaultPension as 'AFP' | 'ONP' | 'ninguno')
        };

        const { sueldoFinal } = calcularSueldoFinal(empleadoActualizado);
        
        return {
          ...empleadoActualizado,
          SueldoFinal: sueldoFinal
        };
      }
      return emp;
    }));
  };

  const handlePensionChange = (codigo: string, pension: 'AFP' | 'ONP') => {
    setEmpleados(prev => prev.map(emp => {
      if (emp.Codigo === codigo && emp.TipoPlanilla === 'regular') {
        const empleadoActualizado = {
          ...emp,
          Pension: pension as 'AFP' | 'ONP' | 'ninguno'
        };

        const { sueldoFinal } = calcularSueldoFinal(empleadoActualizado);
        
        return {
          ...empleadoActualizado,
          SueldoFinal: sueldoFinal
        };
      }
      return emp;
    }));
  };

  const handleBonoExtraChange = (codigo: string, bono: number) => {
    setEmpleados(prev => prev.map(emp => {
      if (emp.Codigo === codigo) {
        const empleadoActualizado = {
          ...emp,
          BonoExtra: bono
        };

        const { sueldoFinal } = calcularSueldoFinal(empleadoActualizado);
        
        return {
          ...empleadoActualizado,
          SueldoFinal: sueldoFinal
        };
      }
      return emp;
    }));
  };

  const handleSedeChange = (codigo: string, sede: string) => {
    setEmpleados(prev => prev.map(emp => {
      if (emp.Codigo === codigo) {
        return {
          ...emp,
          Sede: sede
        };
      }
      return emp;
    }));
  };

  // Filtrado de empleados
  const empleadosFiltrados = useMemo(() => {
    return empleados.filter(emp => {
      const matchesSearch = 
        emp.Codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.Nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.Dni.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.Cargo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.Empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.Rubro.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesReporte = filterReporte === 'TODOS' || emp.NombreReporte === filterReporte;
      
      return matchesSearch && matchesReporte;
    });
  }, [empleados, searchTerm, filterReporte]);

  // Datos por rubro
  const datosPorRubro = useMemo(() => {
    const rubrosMap = new Map<string, RubroSummary>();
    
    empleadosFiltrados.forEach(emp => {
      const rubro = emp.Rubro || 'Sin Rubro';
      
      if (!rubrosMap.has(rubro)) {
        rubrosMap.set(rubro, {
          nombre: rubro,
          cantidadEmpleados: 0,
          totalSueldos: 0,
          totalDescuentos: 0,
          totalBonos: 0,
          totalFinal: 0,
          color: COLORS[rubrosMap.size % COLORS.length]
        });
      }
      
      const rubroExistente = rubrosMap.get(rubro)!;
      rubrosMap.set(rubro, {
        ...rubroExistente,
        cantidadEmpleados: rubroExistente.cantidadEmpleados + 1,
        totalSueldos: rubroExistente.totalSueldos + emp.SueldoMensual,
        totalDescuentos: rubroExistente.totalDescuentos + emp.Descuentos,
        totalBonos: rubroExistente.totalBonos + (emp.BonoExtra || 0),
        totalFinal: rubroExistente.totalFinal + emp.SueldoFinal
      });
    });
    
    return Array.from(rubrosMap.values()).sort((a, b) => 
      b.totalFinal - a.totalFinal
    );
  }, [empleadosFiltrados]);

  // Datos por ocupación
  const datosPorOcupacion = useMemo(() => {
    const ocupacionesMap = new Map<string, OcupacionSummary>();
    
    empleadosFiltrados.forEach(emp => {
      const ocupacion = emp.Cargo || 'Sin Especificar';
      
      if (!ocupacionesMap.has(ocupacion)) {
        ocupacionesMap.set(ocupacion, {
          nombre: ocupacion,
          cantidadEmpleados: 0,
          totalSueldos: 0,
          totalDescuentos: 0,
          totalBonos: 0,
          totalFinal: 0,
          color: COLORS[ocupacionesMap.size % COLORS.length]
        });
      }
      
      const ocupacionData = ocupacionesMap.get(ocupacion)!;
      ocupacionData.cantidadEmpleados += 1;
      ocupacionData.totalSueldos += emp.SueldoMensual;
      ocupacionData.totalDescuentos += emp.Descuentos;
      ocupacionData.totalBonos += emp.BonoExtra || 0;
      ocupacionData.totalFinal += emp.SueldoFinal;
    });
    
    return Array.from(ocupacionesMap.values()).sort((a, b) => 
      b.totalFinal - a.totalFinal
    );
  }, [empleadosFiltrados]);

  // Paginación
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = empleadosFiltrados.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(empleadosFiltrados.length / recordsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Datos por reporte
  const datosPorReporte = useMemo(() => {
    const reportesUnicos = Array.from(new Set(empleadosFiltrados.map(e => e.NombreReporte)));
    
    return reportesUnicos.map(reporte => {
      const empleadosReporte = empleadosFiltrados.filter(e => e.NombreReporte === reporte);
      const totalSueldos = empleadosReporte.reduce((sum, emp) => sum + emp.SueldoFinal, 0);
      
      return {
        name: reporte,
        value: totalSueldos,
        empleados: empleadosReporte.length,
        color: COLORS[reportesUnicos.indexOf(reporte) % COLORS.length]
      };
    });
  }, [empleadosFiltrados]);

  const datosFiltradosPorReporte = useMemo(() => {
    if (filterReporte === 'TODOS') return datosPorReporte;
    return datosPorReporte.filter(item => item.name === filterReporte);
  }, [datosPorReporte, filterReporte]);

  const handleExport = () => {
    const archivosOrigen = Array.from(new Set(empleados.map(e => e.ArchivoOrigen)));
    const reportes = Array.from(new Set(empleados.map(e => e.NombreReporte))).join(', ');
    
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
  
    const wsData = [
      [{ v: "PLANILLA DETALLADA DE ASISTENCIAS", t: "s", s: titleStyle }],
      ["Fuente de datos:", { v: archivosOrigen.join(', '), t: "s" }],
      ["Reportes:", { v: reportes, t: "s" }],
      ["Descuento por tardanza:", { v: `S/${descuentoTardanza.toFixed(2)}`, t: "s" }],
      [],
      
      [
        { v: "Codigo", s: headerStyle },
        { v: "Empleado", s: headerStyle },
        { v: "Dni", s: headerStyle },
        { v: "Cargo", s: headerStyle },
        { v: "Sede", s: headerStyle },
        { v: "Tipo Planilla", s: headerStyle },
        { v: "Pensión", s: headerStyle },
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
        { v: "Bono Extra", s: headerStyle },
        { v: "Sueldo Final", s: headerStyle },
        { v: "Reporte", s: headerStyle },
        { v: "Archivo Origen", s: headerStyle }
      ],
      
      ...empleadosFiltrados.map(emp => [
        emp.Codigo,
        emp.Nombre,
        emp.Dni,
        emp.Cargo,
        emp.Sede,
        emp.TipoPlanilla === 'regular' ? 'Planilla' : 'Honorarios',
        emp.Pension === 'ninguno' ? 'N/A' : emp.Pension,
        { v: emp.SueldoMensual.toFixed(2), t: "n" },
        { v: emp.SueldoDiario.toFixed(2), t: "n" },
        ...Array.from({length: diasDelMes}, (_, i) => {
          const valor = emp.Dias[`Dia${i + 1}`] || 'NL';
          let color = "000000";
          
          if (valor === 'PU') color = "00B050";
          else if (valor === 'TA') color = "FF0000";
          else if (valor === 'FA') color = "C00000";
          else if (valor === 'NL') color = "7F7F7F";
          
          return { 
            v: valor, 
            s: { font: { color: { rgb: color } } 
          }, };
        }),
        { v: emp.Puntuales, t: "n", s: { font: { color: { rgb: "00B050" } } } },
        { v: emp.Tardanzas, t: "n", s: { font: { color: { rgb: "FF0000" } } } },
        { v: emp.Faltas, t: "n", s: { font: { color: { rgb: "C00000" } } } },
        { v: emp.Descuentos.toFixed(2), t: "n", s: { font: { color: { rgb: "FF0000" } } } },
        { v: emp.BonoExtra.toFixed(2), t: "n", s: { font: { color: { rgb: "00B050" } } } },
        { v: emp.SueldoFinal.toFixed(2), t: "n", s: { font: { bold: true } } },
        emp.NombreReporte,
        emp.ArchivoOrigen
      ]),
      [
        { v: "PU = Puntual", s: footerStyle }, "",
        { v: `TA = Tardanza (-S/.${descuentoTardanza.toFixed(2)})`, s: { ...footerStyle, font: { color: { rgb: "FF0000" } } } }, "",
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
  
    const wsResumenData = [
      [{ v: "RESUMEN DE PAGOS", s: titleStyle }],
      ["", { v: `REPORTES: ${reportes}`, s: { font: { bold: true } } }],
      ["", { v: `Fuente de datos: ${archivosOrigen.join(', ')}`, s: { font: { italic: true } } }],
      ["", { v: `Descuento por tardanza: S/${descuentoTardanza.toFixed(2)}`, s: { font: { color: { rgb: "FF0000" } } } }],
      [],
      
      [
        { v: "Empleado", s: headerStyle },
        { v: "DNI", s: headerStyle },
        { v: "Sede", s: headerStyle },
        { v: "Tipo Planilla", s: headerStyle },
        { v: "Pensión", s: headerStyle },
        { v: "Sueldo Mensual", s: headerStyle },
        { v: "Descuentos", s: headerStyle },
        { v: "Bono Extra", s: headerStyle },
        { v: "Sueldo Final", s: headerStyle },
        { v: "Reporte", s: headerStyle }
      ],
      
      ...empleadosFiltrados.map(emp => [
        emp.Nombre,
        emp.Dni,
        emp.Sede,
        emp.TipoPlanilla === 'regular' ? 'Planilla' : 'Honorarios',
        emp.Pension === 'ninguno' ? 'N/A' : emp.Pension,
        { v: emp.SueldoMensual.toFixed(2), t: "n" },
        { v: emp.Descuentos.toFixed(2), t: "n", s: { font: { color: { rgb: "FF0000" } } } },
        { v: emp.BonoExtra.toFixed(2), t: "n", s: { font: { color: { rgb: "00B050" } } } },
        { v: emp.SueldoFinal.toFixed(2), t: "n", s: { font: { bold: true } } },
        emp.NombreReporte
      ]),
      [
        { v: "TOTALES", s: totalStyle }, "", "", "",
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
          v: empleadosFiltrados.reduce((sum, emp) => sum + emp.BonoExtra, 0).toFixed(2), 
          t: "n", 
          s: { ...totalStyle, font: { color: { rgb: "00B050" } } }
        },
        { 
          v: empleadosFiltrados.reduce((sum, emp) => sum + emp.SueldoFinal, 0).toFixed(2), 
          t: "n", 
          s: { ...totalStyle, font: { color: { rgb: "00B050" } } }
        },
        ""
      ],
      
      [],
      [
        { v: `Documento generado el: ${new Date().toLocaleString()}`, s: footerStyle }, "",
        { v: `Fuente: ${archivosOrigen.join(', ')}`, s: footerStyle }
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wsResumen = XLSX.utils.aoa_to_sheet(wsResumenData);
    const colWidths = [
      { wch: 8 },  // Código
      { wch: 30 }, // Nombre
      { wch: 10 }, // DNI
      { wch: 20 }, // Cargo
      { wch: 10 }, // Sede
      { wch: 12 }, // Tipo Planilla
      { wch: 10 }, // Pensión
      { wch: 15 }, // Sueldo Mensual
      { wch: 15 }, // Sueldo Diario
      ...Array(diasDelMes).fill({ wch: 5 }), // Días
      { wch: 8 },  // Puntual
      { wch: 8 },  // Tardanza
      { wch: 8 },  // Faltas
      { wch: 12 }, // Descuentos
      { wch: 12 }, // Bono Extra
      { wch: 12 }, // Sueldo Final
      { wch: 15 }, // Reporte
      { wch: 40 }  // Archivo Origen
    ];
    ws['!cols'] = colWidths;
    
    const resumenColWidths = [
      { wch: 30 }, // Nombre
      { wch: 12 }, // DNI
      { wch: 10 }, // Sede
      { wch: 12 }, // Tipo Planilla
      { wch: 10 }, // Pensión
      { wch: 15 }, // Sueldo Mensual
      { wch: 15 }, // Descuentos
      { wch: 15 }, // Bono Extra
      { wch: 15 }, // Sueldo Final
      { wch: 20 }  // Reporte
    ];
    wsResumen['!cols'] = resumenColWidths;
  
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle Asistencias');
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Pagos');
    
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, -5);
    
    XLSX.writeFile(wb, `Planilla_Consolidada_${reportes.replace(/, /g, '-')}_${timestamp}.xlsx`);
  };

  const leyendaEstados = [
    { codigo: 'PU', significado: 'Puntual', color: 'bg-green-100 text-green-800 border-green-200' },
    { codigo: 'TA', significado: `Tardanza (-S/.${descuentoTardanza.toFixed(2)})`, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { codigo: 'FA', significado: 'Falta (-1 día de sueldo)', color: 'bg-red-100 text-red-800 border-red-200' },
    { codigo: 'NL', significado: 'No Laborable', color: 'bg-gray-100 text-gray-800 border-gray-200' },
    { codigo: 'AS', significado: 'Asistió', color: 'bg-green-200 text-green-800 border-green-300' },
    { codigo: 'DM', significado: 'Descanso Médico', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    { codigo: 'PE', significado: 'Permiso', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    { codigo: 'VA', significado: 'Vacaciones', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
    { codigo: 'DE', significado: 'Día Extra', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    { codigo: 'JU', significado: 'Justificado', color: 'bg-lime-100 text-lime-800 border-lime-200' }
  ];

  const buttonStyle = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium";
  const primaryButtonStyle = `${buttonStyle} bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg`;
  const successButtonStyle = `${buttonStyle} bg-green-600 text-white hover:bg-green-700 shadow-md`;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md hidden md:block">
        <div className="p-4 flex items-center justify-center border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Calendar className="text-green-600" size={28} />
            <h1 className="text-xl font-bold text-gray-800">Gestión de Asistencias</h1>
          </div>
        </div>
        <nav className="p-4">
          <button
            onClick={() => setActiveTab('asistencias')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 ${activeTab === 'asistencias' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Users size={20} />
            <span>Asistencias</span>
          </button>
          <button
            onClick={() => setActiveTab('reportes')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 ${activeTab === 'reportes' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <BarChart2 size={20} />
            <span>Reportes</span>
          </button>
          <div className="mt-8 pt-4 border-t border-gray-200">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-4">
              Configuración
            </h3>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-gray-100">
              <Settings size={20} />
              <span>Ajustes</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {activeTab === 'asistencias' ? 'Gestión de Asistencias' : 'Reportes y Estadísticas'}
            </h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="text-gray-400" size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-6">
          {/* Mostrar errores de validación */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Empleados no validados ({Object.keys(validationErrors).length})
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1 max-h-40 overflow-y-auto">
                      {Object.entries(validationErrors).map(([key, error]) => (
                        <li key={key} className="truncate">
                          <span className="font-medium">{key}</span>: {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isValidating && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <div className="flex items-center justify-center gap-4">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Validando empleados</h3>
                    <p className="text-gray-500">Consultando la base de datos...</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'asistencias' ? (
            <>
              {/* Panel de configuración */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6 p-6">
                <h2 className="text-xl font-semibold mb-4">Configuración General</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de planilla por defecto
                    </label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={defaultTipoPlanilla}
                      onChange={(e) => setDefaultTipoPlanilla(e.target.value as 'honorarios' | 'regular')}
                    >
                      <option value="honorarios">Recibos por Honorarios</option>
                      <option value="regular">Planilla Regular</option>
                    </select>
                  </div>
                  
                  {defaultTipoPlanilla === 'regular' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sistema de Pensión por defecto
                      </label>
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={defaultPension}
                        onChange={(e) => setDefaultPension(e.target.value as 'AFP' | 'ONP')}
                      >
                        <option value="AFP">AFP (11.7%)</option>
                        <option value="ONP">ONP (13%)</option>
                      </select>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sede por defecto
                    </label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={defaultSede}
                      onChange={(e) => setDefaultSede(e.target.value)}
                    >
                      {sedes.map((sede) => (
                        <option key={sede} value={sede}>{sede}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descuento por tardanza (S/.)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={descuentoTardanza}
                        onChange={(e) => setDescuentoTardanza(Number(e.target.value))}
                        min="0"
                        step="0.01"
                      />
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="text-gray-400" size={18} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel de control */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden mb-8">
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

                <div className="p-6">
                  <div className="flex flex-wrap justify-between gap-6 mb-6">
                    <div className="flex-1 min-w-[300px] space-y-4">
                      <div className="flex flex-wrap gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Filter className="text-gray-400" size={18} />
                          </div>
                          <select
                            className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                            value={filterReporte}
                            onChange={(e) => setFilterReporte(e.target.value)}
                          >
                            {reportesDisponibles.map((reporte, index) => (
                              <option key={index} value={reporte}>
                                {reporte === 'TODOS' ? 'Todos los reportes' : reporte}
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
                            <h4 className="font-medium flex items-center gap-2 text-sm">
                              <FileUp size={16} />
                              Archivos cargados ({archivosCargados.length})
                            </h4>
                            <span className="text-xs text-gray-500">
                              {empleados.length} registros
                            </span>
                          </div>
                          <div className="max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {archivosCargados.map((archivo, index) => {
                              const nombreReporte = extraerNombreReporte(archivo);
                              const reportIndex = reportesDisponibles.slice(1).indexOf(nombreReporte);
                              const color = COLORS[reportIndex % COLORS.length];
                              
                              return (
                                <div 
                                  key={index} 
                                  className="flex justify-between items-center py-1.5 px-2 hover:bg-gray-100 rounded text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div 
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: color }}
                                    />
                                    <div className="truncate">
                                      <p className="font-medium truncate">{archivo}</p>
                                      <p className="text-gray-500 truncate text-xxs">Reporte: {nombreReporte}</p>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => handleRemoveFile(archivo)}
                                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 ml-2"
                                    title="Eliminar archivo"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

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

              {/* Tabla resumen general */}
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    Resumen General
                  </h3>
                  <div className="flex gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total Sueldo</p>
                      <p className="font-bold text-green-600">
                        S/.{empleadosFiltrados.reduce((sum, emp) => sum + emp.SueldoFinal, 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total Descuentos</p>
                      <p className="font-bold text-red-600">
                        S/.{empleadosFiltrados.reduce((sum, emp) => sum + emp.Descuentos, 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Empleados</p>
                      <p className="font-bold text-blue-600">{empleadosFiltrados.length}</p>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reporte</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Empresa</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rubro</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sueldo</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Descuentos</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Bonos</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Empleados</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {datosPorReporte.map((reporte) => {
                        const empleadosReporte = empleadosFiltrados.filter(e => e.NombreReporte === reporte.name);
                        const totalDescuentos = empleadosReporte.reduce((sum, emp) => sum + emp.Descuentos, 0);
                        const totalBonos = empleadosReporte.reduce((sum, emp) => sum + (emp.BonoExtra || 0), 0);
                        const empresas = Array.from(new Set(empleadosReporte.map(e => e.Empresa))).join(', ');
                        const rubros = Array.from(new Set(empleadosReporte.map(e => e.Rubro))).join(', ');
                        return (
                          <tr key={reporte.name} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full flex-shrink-0" 
                                  style={{ backgroundColor: reporte.color }}
                                />
                                <span className="text-sm text-gray-700">{reporte.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {empresas || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {rubros || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-500">
                              S/.{reporte.value.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-red-500">
                              S/.{totalDescuentos.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-green-500">
                              S/.{totalBonos.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                              {reporte.empleados}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-6 py-3 text-sm font-medium text-gray-700">Totales</td>
                        <td className="px-6 py-3 text-sm text-right font-mono font-medium text-gray-700">
                          S/.{datosPorReporte.reduce((sum, reporte) => sum + reporte.value, 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-sm text-right font-mono font-medium text-red-600">
                          S/.{empleadosFiltrados.reduce((sum, emp) => sum + emp.Descuentos, 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-sm text-right font-mono font-medium text-green-600">
                          S/.{empleadosFiltrados.reduce((sum, emp) => sum + (emp.BonoExtra || 0), 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-blue-700">
                          {empleadosFiltrados.length}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {empleadosFiltrados.length > 0 ? (
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="relative">
                    <div className="md:hidden text-center py-2 bg-blue-50 text-sm">
                      <div className="inline-flex items-center text-blue-600">
                        <ArrowRight className="w-4 h-4 mr-1" />
                        Desliza horizontalmente para ver más días
                      </div>
                    </div>

                    <div 
                      className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
                      style={{ maxHeight: 'calc(100vh - 400px)' }}
                    >
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0 z-20">
                          <tr>
                            <th className="sticky left-0 z-30 bg-gray-100 p-3 text-left font-semibold text-gray-700 whitespace-nowrap min-w-[80px]">Código</th>
                            <th className="sticky left-20 z-30 bg-gray-100 p-3 text-left font-semibold text-gray-700 whitespace-nowrap min-w-[180px]">Empleado</th>
                            <th className="sticky left-48 z-30 bg-gray-100 p-3 text-left font-semibold text-gray-700 whitespace-nowrap min-w-[100px]">DNI</th>
                            <th className="p-3 text-left font-semibold text-gray-700 whitespace-nowrap min-w-[100px]">S. Mensual</th>
                            <th className="p-3 text-left font-semibold text-gray-700 whitespace-nowrap min-w-[90px]">S. Diario</th>
                            
                            <th className="p-3 text-center font-semibold text-gray-700 whitespace-nowrap min-w-[100px] bg-purple-50">Tipo</th>
                            <th className="p-3 text-center font-semibold text-gray-700 whitespace-nowrap min-w-[90px] bg-indigo-50">Pensión</th>
                            <th className="p-3 text-center font-semibold text-gray-700 whitespace-nowrap min-w-[110px] bg-green-50">Bono Extra</th>
                            
                            {Array.from({length: diasDelMes}, (_, i) => (
                              <th 
                                key={`dia-${i}`}
                                className="p-2 text-center font-semibold text-gray-700 whitespace-nowrap bg-blue-50 min-w-[50px]"
                              >
                                Día {i + 1}
                              </th>
                            ))}
                            
                            <th className="p-3 text-center font-semibold text-gray-700 whitespace-nowrap min-w-[70px] bg-green-50">Punt.</th>
                            <th className="p-3 text-center font-semibold text-gray-700 whitespace-nowrap min-w-[70px] bg-yellow-50">Tard.</th>
                            <th className="p-3 text-center font-semibold text-gray-700 whitespace-nowrap min-w-[70px] bg-red-50">Faltas</th>
                            <th className="p-3 text-center font-semibold text-gray-700 whitespace-nowrap min-w-[90px] bg-orange-50">Desctos.</th>
                            <th className="p-3 text-center font-semibold text-gray-700 whitespace-nowrap min-w-[100px] bg-blue-100">Total</th>
                            <th className="p-3 text-center font-semibold text-gray-700 whitespace-nowrap min-w-[120px] bg-gray-100">Reporte</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {currentRecords.map((emp, empIndex) => (
                            <tr 
                              key={`${emp.Codigo}-${empIndex}`} 
                              className="group relative hover:bg-blue-50 even:bg-gray-50/30 transition-colors duration-150"
                            >
                              <td className="sticky left-0 z-20 bg-white group-hover:bg-blue-50 p-3 font-mono text-left border-r border-gray-200">
                                {emp.Codigo}
                              </td>
                              
                              <td className="sticky left-20 z-20 bg-white group-hover:bg-blue-50 p-3 border-r border-gray-200">
                                <div className="font-medium">{emp.Nombre}</div>
                                <div className="text-gray-500 text-xs">{emp.Cargo}</div>
                              </td>
                              
                              <td className="sticky left-48 z-20 bg-white group-hover:bg-blue-50 p-3 font-mono text-right border-r border-gray-200">
                                {emp.Dni}
                              </td>

                              <td className="p-3 font-mono text-right group-hover:bg-blue-50/50">
                                S/.{emp.SueldoMensual.toFixed(2)}
                              </td>
                              
                              <td className="p-3 font-mono text-right group-hover:bg-blue-50/50">
                                S/.{emp.SueldoDiario.toFixed(2)}
                              </td>
                              
                              <td className="p-3 text-center bg-purple-50 group-hover:bg-blue-50/50">
                                <select
                                  value={emp.TipoPlanilla}
                                  onChange={(e) => handleTipoPlanillaChange(emp.Codigo, e.target.value as 'honorarios' | 'regular')}
                                  className="w-full p-2 text-sm text-center rounded border border-purple-200 bg-white focus:ring-1 focus:ring-purple-500 focus:border-purple-500 group-hover:border-blue-300"
                                >
                                  <option value="honorarios">Honorarios</option>
                                  <option value="regular">Planilla</option>
                                </select>
                              </td>
                              
                              <td className="p-3 text-center bg-indigo-50 group-hover:bg-blue-50/50">
                                {emp.TipoPlanilla === 'regular' ? (
                                  <select
                                    value={emp.Pension}
                                    onChange={(e) => handlePensionChange(emp.Codigo, e.target.value as 'AFP' | 'ONP')}
                                    className="w-full p-2 text-sm text-center rounded border border-indigo-200 bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 group-hover:border-blue-300"
                                  >
                                    <option value="AFP">AFP</option>
                                    <option value="ONP">ONP</option>
                                  </select>
                                ) : (
                                  <span className="text-gray-400 text-sm">N/A</span>
                                )}
                              </td>
                              
                              <td className="p-3 text-center bg-green-50 group-hover:bg-blue-50/50">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleBonoExtraChange(emp.Codigo, Math.max(0, (emp.BonoExtra || 0) - 50))}
                                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded group-hover:bg-blue-100"
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <input
                                    type="number"
                                    value={emp.BonoExtra || 0}
                                    onChange={(e) => handleBonoExtraChange(emp.Codigo, Number(e.target.value))}
                                    className="w-20 p-1 text-sm text-center border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500 group-hover:border-blue-300"
                                    min="0"
                                    step="50"
                                  />
                                  <button
                                    onClick={() => handleBonoExtraChange(emp.Codigo, (emp.BonoExtra || 0) + 50)}
                                    className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded group-hover:bg-blue-100"
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                              </td>
                              
                              {Array.from({length: diasDelMes}, (_, i) => {
                                const estado = emp.Dias[`Dia${i + 1}`] || 'NL';
                                const estadoConfig = leyendaEstados.find(e => e.codigo === estado);
                                return (
                                  <td key={i} className="p-2 text-center group-hover:bg-blue-50/50">
                                    <select
                                      value={estado}
                                      onChange={(e) => handleDayChange(emp.Codigo, i + 1, e.target.value)}
                                      className={`w-full p-2 text-sm text-center rounded border focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
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
                              
                              <td className="p-3 text-center bg-green-50 text-green-800 font-medium group-hover:bg-blue-50/50">
                                {emp.Puntuales}
                              </td>
                              <td className="p-3 text-center bg-yellow-50 text-yellow-800 font-medium group-hover:bg-blue-50/50">
                                {emp.Tardanzas}
                              </td>
                              <td className="p-3 text-center bg-red-50 text-red-800 font-medium group-hover:bg-blue-50/50">
                                {emp.Faltas}
                              </td>
                              <td className="p-3 text-center bg-orange-50 text-orange-800 font-mono group-hover:bg-blue-50/50">
                                S/.{emp.Descuentos.toFixed(2)}
                              </td>
                              <td className="p-3 text-center bg-blue-100 text-blue-900 font-mono font-bold group-hover:bg-blue-200">
                                S/.{emp.SueldoFinal.toFixed(2)}
                              </td>
                              <td className="p-3 text-center bg-gray-100 group-hover:bg-blue-50/50">
                                <span className="inline-block max-w-[120px] truncate">
                                  {emp.NombreReporte}
                                </span>
                              </td>
                              
                              <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-200 pointer-events-none" />
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

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
                            setFilterReporte('TODOS');
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
            </>
          ) : (
            <div className="space-y-6">
              {/* Filtro para reportes */}
              <div className="bg-white p-4 rounded-lg shadow-md">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Filter className="text-blue-500" size={20} />
                    Filtros de Reportes
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Seleccionar Reporte
                      </label>
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={filterReporte}
                        onChange={(e) => setFilterReporte(e.target.value)}
                      >
                        {reportesDisponibles.map((reporte, index) => (
                          <option key={index} value={reporte}>
                            {reporte === 'TODOS' ? 'Todos los reportes' : reporte}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>   
              
              {/* Gráfico de barras por reporte */}
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart2 className="text-green-500" size={20} />
                    Distribución por Reporte
                  </h3>
                  <div className="text-sm text-gray-500">
                    Total: S/.{datosPorReporte.reduce((sum, item) => sum + item.value, 0).toFixed(2)}
                  </div>
                </div>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={datosFiltradosPorReporte}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`S/.${Number(value).toFixed(2)}`, 'Total']}
                      />
                      <Legend />
                      <Bar dataKey="value" name="Total Sueldo">
                        {datosFiltradosPorReporte.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Resumen por Rubro */}
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart2 className="text-purple-500" size={20} />
                  Resumen por Rubro
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {datosPorRubro.map((rubro) => (
                    <div key={rubro.nombre} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                      <div 
                        className="px-4 py-3 border-b border-gray-200 flex items-center justify-between"
                        style={{ backgroundColor: `${rubro.color}20`, borderColor: rubro.color }}
                      >
                        <h4 className="font-medium text-gray-800 flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: rubro.color }}
                          />
                          {rubro.nombre}
                        </h4>
                        <span className="text-sm font-mono bg-white px-2 py-1 rounded">
                          {rubro.cantidadEmpleados} empleados
                        </span>
                      </div>
                      
                      <div className="divide-y divide-gray-200">
                        <div className="px-4 py-3 flex justify-between items-center">
                          <span className="text-gray-600">Total Sueldos:</span>
                          <span className="font-mono text-green-600">
                            S/.{rubro.totalSueldos.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="px-4 py-3 flex justify-between items-center">
                          <span className="text-gray-600">Total Descuentos:</span>
                          <span className="font-mono text-red-500">
                            S/.{rubro.totalDescuentos.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="px-4 py-3 flex justify-between items-center">
                          <span className="text-gray-600">Total Bonos:</span>
                          <span className="font-mono text-blue-500">
                            S/.{rubro.totalBonos.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="px-4 py-3 flex justify-between items-center bg-gray-50">
                          <span className="font-medium text-gray-700">Total a Pagar:</span>
                          <span className="font-mono font-bold text-purple-600">
                            S/.{rubro.totalFinal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumen por Ocupación */}
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <User className="text-blue-500" size={20} />
                  Resumen por Ocupación (Cargo)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {datosPorOcupacion.map((ocupacion) => (
                    <div key={ocupacion.nombre} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                      <div 
                        className="px-4 py-3 border-b border-gray-200 flex items-center justify-between"
                        style={{ backgroundColor: `${ocupacion.color}20`, borderColor: ocupacion.color }}
                      >
                        <h4 className="font-medium text-gray-800 flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: ocupacion.color }}
                          />
                          <span className="truncate" title={ocupacion.nombre}>
                            {ocupacion.nombre}
                          </span>
                        </h4>
                        <span className="text-sm font-mono bg-white px-2 py-1 rounded flex-shrink-0">
                          {ocupacion.cantidadEmpleados} {ocupacion.cantidadEmpleados === 1 ? 'empleado' : 'empleados'}
                        </span>
                      </div>
                      
                      <div className="divide-y divide-gray-200">
                        <div className="px-4 py-2.5 flex justify-between items-center">
                          <span className="text-sm text-gray-600">Sueldo Base:</span>
                          <span className="font-mono text-sm text-green-600">
                            S/.{ocupacion.totalSueldos.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="px-4 py-2.5 flex justify-between items-center">
                          <span className="text-sm text-gray-600">Promedio Sueldo:</span>
                          <span className="font-mono text-sm text-green-700">
                            S/.{(ocupacion.totalSueldos / ocupacion.cantidadEmpleados).toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="px-4 py-2.5 flex justify-between items-center">
                          <span className="text-sm text-gray-600">Descuentos:</span>
                          <span className="font-mono text-sm text-red-500">
                            S/.{ocupacion.totalDescuentos.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="px-4 py-2.5 flex justify-between items-center">
                          <span className="text-sm text-gray-600">Bonos:</span>
                          <span className="font-mono text-sm text-blue-500">
                            S/.{ocupacion.totalBonos.toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="px-4 py-2.5 flex justify-between items-center bg-gray-50">
                          <span className="text-sm font-medium text-gray-700">Total a Pagar:</span>
                          <span className="font-mono text-sm font-bold text-purple-600">
                            S/.{ocupacion.totalFinal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Opcional: Mostrar por reporte si hay más de uno */}
              {filterReporte === 'TODOS' && datosPorReporte.length > 1 && (
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-700 mb-3">Desglose por Reporte</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-2 text-left border-b border-gray-200 font-medium text-gray-700">Reporte</th>
                          <th className="px-4 py-2 text-right border-b border-gray-200 font-medium text-gray-700">Total Sueldo</th>
                          <th className="px-4 py-2 text-right border-b border-gray-200 font-medium text-gray-700">Empleados</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosPorReporte.map((reporte) => (
                          <tr key={reporte.name} className="hover:bg-gray-50">
                            <td className="px-4 py-2 border-b border-gray-200">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: reporte.color }}
                                />
                                {reporte.name}
                              </div>
                            </td>
                            <td className="px-4 py-2 border-b border-gray-200 text-right font-mono">
                              S/.{reporte.value.toFixed(2)}
                            </td>
                            <td className="px-4 py-2 border-b border-gray-200 text-right font-mono">
                              {reporte.empleados}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Leyenda de archivos cargados */}
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FileUp className="text-blue-500" size={20} />
                  Archivos Cargados ({archivosCargados.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {archivosCargados.map((archivo, index) => {
                    const nombreReporte = extraerNombreReporte(archivo);
                    const reportIndex = reportesDisponibles.slice(1).indexOf(nombreReporte);
                    const color = COLORS[reportIndex % COLORS.length];
                    
                    return (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">{archivo}</p>
                          <p className="text-xs text-gray-500 truncate">Reporte: {nombreReporte}</p>
                        </div>
                        <button 
                          onClick={() => handleRemoveFile(archivo)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                          title="Eliminar archivo"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AttendanceManagement;