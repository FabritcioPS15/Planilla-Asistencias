import React, { useState, useEffect } from 'react';
import { PlusCircle, Edit2, Trash2, FileUp, FileDown, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { supabase } from './supabase';

interface Person {
  dni: string;
  nombre: string;
  ocupacion: string;
  salario: number;
  fechaingreso: string;
  activo: boolean;
  sede: 'Andahuaylas' | 'Ayacucho' | 'Callao' | 'Huacho' | 'Huancavelica' | 'Ica' | 'Independencia' | 'La Molina'| 'SMP';
  empresa: 'BREVETES APURIMAC SAC' | 'MI BREVETE SEGURO SAC' | 'RTP SAN CRISTÓBAL SAC' | 'RTV SAN CRISTÓBAL SAC' | 'SAN CRISTÓBAL DEL PERÚ SAC' | 'SAN CRISTÓBAL VIP SAC' | 'SAN LUIS MEDIC SAC';
  rubro: 'CITV' | 'ECSAL' | 'ESCON' | 'Central';
  celular: string;
  correo: string;
  vacaciones: number;
  estadocivil: 'soltero' | 'casado' | 'divorciado' | 'viudo';
  numerohijos: number;
  fechanacimiento: string;
  nacionalidad: string;
  banco: string;
  numerocuenta: string;
  tipocuenta: 'ahorros' | 'corriente';
  cuentainterbancaria: string;
  contactoemergencia: string;
  niveleducativo: 'secundaria' | 'tecnico' | 'universitario' | 'posgrado';
  carreraespecialidad: string;
}

const PeopleManagement: React.FC = () => {
  const [people, setPeople] = useState<(Person & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [personForm, setPersonForm] = useState<Person>({
    dni: '',
    nombre: '',
    ocupacion: '',
    salario: 0,
    fechaingreso: format(new Date(), 'yyyy-MM-dd'),
    activo: true,
    sede: 'SMP',
    empresa: 'MI BREVETE SEGURO SAC',
    rubro: 'CITV',
    celular: '',
    correo: '',
    vacaciones: 0,
    estadocivil: 'soltero',
    numerohijos: 0,
    fechanacimiento: '',
    nacionalidad: '',
    banco: '',
    numerocuenta: '',
    tipocuenta: 'ahorros',
    cuentainterbancaria: '',
    contactoemergencia: '',
    niveleducativo: 'secundaria',
    carreraespecialidad: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterField, setFilterField] = useState<string>('all');
  const [activeSection, setActiveSection] = useState<string>('basic');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rubroFilter, setRubroFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setPeople(data || []);
      setCurrentPage(1);
    } catch (error: any) {
      console.error('Error fetching people:', error);
      setError('Error al cargar los datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePersonFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    let parsedValue: any = value;
    if (type === 'checkbox') {
      parsedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
      parsedValue = Number(value);
    } else if (name === 'fechanacimiento' || name === 'fechaingreso') {
      parsedValue = value || null;
    }

    setPersonForm(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  const handlePersonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      const requiredFields = [
        'dni', 'nombre', 'correo', 'ocupacion', 
        'salario', 'fechaingreso', 'sede', 'banco',
        'numerocuenta', 'rubro'
      ];
      
      const missingFields = requiredFields.filter(field => !personForm[field as keyof Person]);
      if (missingFields.length > 0) {
        throw new Error(`Campos requeridos faltantes: ${missingFields.join(', ')}`);
      }

      if (!editingId) {
        const { data: existing } = await supabase
          .from('people')
          .select('dni')
          .eq('dni', personForm.dni)
          .single();

        if (existing) {
          throw new Error('El DNI ya está registrado');
        }
      }

      const payload = {
        ...personForm,
        salario: Number(personForm.salario),
        vacaciones: Number(personForm.vacaciones),
        numerohijos: Number(personForm.numerohijos),
        fechanacimiento: personForm.fechanacimiento || null,
        cuentainterbancaria: personForm.cuentainterbancaria || null,
        contactoemergencia: personForm.contactoemergencia || null,
        empresa: personForm.empresa || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('people')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        setPeople(people.map(p => p.id === editingId ? { ...p, ...payload, fechanacimiento: payload.fechanacimiento || '', cuentainterbancaria: payload.cuentainterbancaria || '' } : p));
      } else {
        const { data, error } = await supabase
          .from('people')
          .insert([payload])
          .select();

        if (error) throw error;
        if (data) setPeople([...people, data[0]]);
      }

      resetForm();
      fetchPeople(); // Recargar datos para asegurar consistencia
    } catch (error: any) {
      console.error('Error saving person:', error);
      setError(error.message || 'Error al guardar los datos');
    }
  };

  const resetForm = () => {
    setPersonForm({
      dni: '',
      nombre: '',
      ocupacion: '',
      salario: 0,
      fechaingreso: format(new Date(), 'yyyy-MM-dd'),
      activo: true,
      sede: 'SMP',
      empresa: 'MI BREVETE SEGURO SAC',
      rubro: 'CITV',
      celular: '',
      correo: '',
      vacaciones: 0,
      estadocivil: 'soltero',
      numerohijos: 0,
      fechanacimiento: '',
      nacionalidad: '',
      banco: '',
      numerocuenta: '',
      tipocuenta: 'ahorros',
      cuentainterbancaria: '',
      contactoemergencia: '',
      niveleducativo: 'secundaria',
      carreraespecialidad: ''
    });
    setEditingId(null);
  };

  const handlePersonDelete = async (id: string) => {
    if (window.confirm('¿Está seguro que desea eliminar este registro?')) {
      try {
        const { error } = await supabase
          .from('people')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setPeople(people.filter(p => p.id !== id));
      } catch (error: any) {
        console.error('Error deleting person:', error);
        setError('Error al eliminar el registro: ' + error.message);
      }
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading(true);
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet);
  
        if (jsonData.length === 0 || !('DNI' in jsonData[0]) || !('Nombre' in jsonData[0])) {
          throw new Error('El archivo no tiene el formato correcto. Debe incluir al menos DNI y Nombre.');
        }
  
        const parseDate = (dateStr: any): string | null => {
          if (!dateStr || dateStr.toString().trim() === "") return null;
          
          try {
            if (typeof dateStr === 'number') {
              return format(new Date((dateStr - 25569) * 86400 * 1000), 'yyyy-MM-dd');
            }
            
            if (typeof dateStr === 'string' && dateStr.includes('/')) {
              const [day, month, year] = dateStr.split('/');
              return format(new Date(`${month}/${day}/${year}`), 'yyyy-MM-dd');
            }
            
            if (typeof dateStr === 'string' && dateStr.includes('-')) {
              return dateStr;
            }
            
            return format(new Date(dateStr), 'yyyy-MM-dd');
          } catch (error) {
            console.warn(`No se pudo parsear la fecha: ${dateStr}`);
            return null;
          }
        };
  
        const peopleToImport = jsonData.map((p: any) => {
          const fechaIngreso = parseDate(p['Fecha Ingreso']);
          const fechaNacimiento = parseDate(p['Fecha de nacimiento']);
  
          return {
            dni: p.DNI?.toString()?.trim() || '',
            nombre: p.Nombre?.toString()?.trim() || '',
            ocupacion: p.Ocupación?.toString()?.trim() || '',
            salario: Number(p.Salario) || 0,
            fechaingreso: fechaIngreso || format(new Date(), 'yyyy-MM-dd'),
            activo: p.Activo === 'Sí' || p.Activo === true || p.Activo === 'true',
            sede: p.Sede?.toString()?.trim() || 'SMP',
            empresa: p.Empresa?.toString()?.trim() || 'MI BREVETE SEGURO SAC',
            rubro: p.Rubro?.toString()?.trim() || 'CITV',
            celular: p.Celular?.toString()?.trim() || '',
            correo: p.Correo?.toString()?.trim() || '',
            vacaciones: Number(p.Vacaciones) || 0,
            estadocivil: (p['Estado Civil']?.toString()?.toLowerCase() || 'soltero') as 'soltero' | 'casado' | 'divorciado' | 'viudo',
            numerohijos: Number(p['Número de hijos']) || 0,
            fechanacimiento: fechaNacimiento,
            nacionalidad: p.Nacionalidad?.toString()?.trim() || '',
            banco: p.Banco?.toString()?.trim() || '',
            numerocuenta: p['Número de cuenta']?.toString()?.trim() || '',
            tipocuenta: (p['Tipo de cuenta']?.toString()?.toLowerCase() || 'ahorros') as 'ahorros' | 'corriente',
            cuentainterbancaria: p['Cuenta interbancaria']?.toString()?.trim() || '',
            contactoemergencia: p['Contacto de emergencia']?.toString()?.trim() || '',
            niveleducativo: (p['Nivel educativo']?.toString()?.toLowerCase() || 'secundaria') as 'secundaria' | 'tecnico' | 'universitario' | 'posgrado',
            carreraespecialidad: p['Carrera o especialidad']?.toString()?.trim() || ''
          };
        }).filter(p => p.dni && p.nombre);
  
        const dniCounts: Record<string, number> = {};
        peopleToImport.forEach(p => {
          dniCounts[p.dni] = (dniCounts[p.dni] || 0) + 1;
        });
        const duplicateDnis = Object.entries(dniCounts).filter(([_, count]) => count > 1).map(([dni]) => dni);
        if (duplicateDnis.length > 0) {
          throw new Error(`DNIs duplicados en el archivo: ${duplicateDnis.join(', ')}`);
        }
  
        const { data: existingPeople } = await supabase
          .from('people')
          .select('dni')
          .in('dni', peopleToImport.map(p => p.dni));
  
        const existingDnis = existingPeople?.map(p => p.dni) || [];
        const newPeople = peopleToImport.filter(p => !existingDnis.includes(p.dni));
        const duplicates = peopleToImport.filter(p => existingDnis.includes(p.dni));
  
        if (duplicates.length > 0) {
          if (!window.confirm(`Hay ${duplicates.length} registros con DNIs que ya existen. ¿Desea omitirlos e importar solo los nuevos (${newPeople.length})?`)) {
            return;
          }
        }
  
        if (newPeople.length === 0) {
          throw new Error('No hay registros nuevos para importar.');
        }
        const peopleToInsert = newPeople.map(person => ({
          ...person,
          fechanacimiento: person.fechanacimiento || null,
          fechaingreso: person.fechaingreso || format(new Date(), 'yyyy-MM-dd')
        }));
  
        const { data: insertedData, error } = await supabase
          .from('people')
          .insert(peopleToInsert)
          .select();

        if (error) throw error;
        
        if (insertedData) {
          setPeople(prev => [...prev, ...insertedData]);
          alert(`Se importaron ${insertedData.length} registros correctamente.`);
        }
      } catch (error: any) {
        console.error('Error importing people:', error);
        setError('Error al importar los datos: ' + (error.message || 'Formato de archivo incorrecto'));
      } finally {
        setLoading(false);
        if (e.target) ((e.target as unknown) as HTMLInputElement).value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExport = () => {
    const data = people.map(p => ({
      DNI: p.dni,
      Nombre: p.nombre,
      Ocupación: p.ocupacion,
      Salario: p.salario,
      'Fecha ingreso': p.fechaingreso,
      Activo: p.activo ? 'Sí' : 'No',
      Sede: p.sede,
      Empresa: p.empresa,
      Rubro: p.rubro,
      Celular: p.celular,
      Correo: p.correo,
      Vacaciones: p.vacaciones,
      'Estado Civil': p.estadocivil,
      'Número de hijos': p.numerohijos,
      'Fecha de nacimiento': p.fechanacimiento,
      Nacionalidad: p.nacionalidad,
      Banco: p.banco,
      'Número de cuenta': p.numerocuenta,
      'Tipo de cuenta': p.tipocuenta,
      'Cuenta interbancaria': p.cuentainterbancaria,
      'Contacto de emergencia': p.contactoemergencia,
      'Nivel educativo': p.niveleducativo,
      'Carrera o especialidad': p.carreraespecialidad
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Personal');
    XLSX.writeFile(workbook, `Personal_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const filteredPeople = people.filter(p => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (filterField === 'all') {
        const matchesSearch = Object.values(p).some(v => 
          v?.toString().toLowerCase().includes(term)
        );
        if (!matchesSearch) return false;
      } else {
        const value = p[filterField as keyof typeof p]?.toString().toLowerCase() || '';
        if (!value.includes(term)) return false;
      }
    }
  
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      if (p.activo !== isActive) return false;
    }
  
    if (rubroFilter !== 'all' && p.rubro !== rubroFilter) {
      return false;
    }
  
    return true;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredPeople.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPeople.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? '' : section);
  };

  if (loading && people.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
              </svg>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold">Gestión de Personal</h1>
                <p className="text-blue-100">Administra el registro completo de empleados</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImport}
                  className="hidden"
                  id="people-import"
                />
                <label
                  htmlFor="people-import"
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg cursor-pointer transition-colors"
                >
                  <FileUp size={18} />
                  <span>Importar</span>
                </label>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
                >
                  <FileDown size={18} />
                  <span>Exportar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar empleados..."
                  className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600"
                  >
                    <Filter size={16} />
                    <span>Filtros</span>
                    {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Campo a buscar</label>
                      <select
                        value={filterField}
                        onChange={(e) => setFilterField(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">Todos los campos</option>
                        <option value="dni">DNI</option>
                        <option value="nombre">Nombre</option>
                        <option value="ocupacion">Ocupación</option>
                        <option value="sede">Sede</option>
                        <option value="empresa">Empresa</option>
                        <option value="rubro">Rubro</option>
                        <option value="correo">Correo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">Todos</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rubro</label>
                      <select
                        value={rubroFilter}
                        onChange={(e) => {
                          setRubroFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">Todos</option>
                        <option value="CITV">CITV</option>
                        <option value="ECSAL">ECSAL</option>
                        <option value="ESCON">ESCON</option>
                        <option value="Central">Central</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Table Section */}
          <div className="p-6">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Listado de Personal</h2>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    Mostrando {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredPeople.length)} de {filteredPeople.length} registros
                  </span>
                  <button
                    onClick={() => {
                      resetForm();
                      document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
                  >
                    <PlusCircle size={16} />
                    <span>Nuevo Empleado</span>
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ocupación
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sede
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.length > 0 ? (
                      currentItems.map(person => (
                        <tr key={person.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                {person.nombre.charAt(0)}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{person.nombre}</div>
                                <div className="text-sm text-gray-500">{person.dni}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{person.ocupacion}</div>
                            <div className="text-sm text-gray-500">S/ {person.salario.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{person.sede}</div>
                            <div className="text-sm text-gray-500">{person.rubro}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              person.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {person.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setPersonForm({
                                    dni: person.dni,
                                    nombre: person.nombre,
                                    ocupacion: person.ocupacion,
                                    salario: person.salario,
                                    fechaingreso: person.fechaingreso,
                                    activo: person.activo,
                                    sede: person.sede,
                                    empresa: person.empresa,
                                    rubro: person.rubro,
                                    celular: person.celular,
                                    correo: person.correo,
                                    vacaciones: person.vacaciones,
                                    estadocivil: person.estadocivil,
                                    numerohijos: person.numerohijos,
                                    fechanacimiento: person.fechanacimiento,
                                    nacionalidad: person.nacionalidad,
                                    banco: person.banco,
                                    numerocuenta: person.numerocuenta,
                                    tipocuenta: person.tipocuenta,
                                    cuentainterbancaria: person.cuentainterbancaria,
                                    contactoemergencia: person.contactoemergencia,
                                    niveleducativo: person.niveleducativo,
                                    carreraespecialidad: person.carreraespecialidad
                                  });
                                  setEditingId(person.id);
                                  document.getElementById('form-section')?.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handlePersonDelete(person.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                          No se encontraron registros
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Paginación */}
              {filteredPeople.length > itemsPerPage && (
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a <span className="font-medium">{Math.min(indexOfLastItem, filteredPeople.length)}</span> de <span className="font-medium">{filteredPeople.length}</span> resultados
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                          onClick={() => paginate(1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <span className="sr-only">Primera</span>
                          &laquo;
                        </button>
                        <button
                          onClick={() => paginate(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <span className="sr-only">Anterior</span>
                          &lsaquo;
                        </button>
                        
                        {/* Mostrar números de página */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                          <button
                            key={number}
                            onClick={() => paginate(number)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === number
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {number}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => paginate(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <span className="sr-only">Siguiente</span>
                          &rsaquo;
                        </button>
                        <button
                          onClick={() => paginate(totalPages)}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <span className="sr-only">Última</span>
                          &raquo;
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Section */}
          <div id="form-section" className="p-6 border-t border-gray-200">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">
                  {editingId ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
                </h2>
              </div>
              <form onSubmit={handlePersonSubmit} className="p-6">
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => toggleSection('basic')}
                      className={`px-3 py-1 rounded-full text-sm ${activeSection === 'basic' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      Información Básica
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSection('work')}
                      className={`px-3 py-1 rounded-full text-sm ${activeSection === 'work' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      Datos Laborales
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSection('personal')}
                      className={`px-3 py-1 rounded-full text-sm ${activeSection === 'personal' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      Datos Personales
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSection('bank')}
                      className={`px-3 py-1 rounded-full text-sm ${activeSection === 'bank' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      Datos Bancarios
                    </button>
                  </div>

                  {/* Basic Information */}
                  {(activeSection === 'basic' || !activeSection) && (
                    <div className="space-y-4">
                      <h3 className="font-medium text-gray-700 border-b pb-2">Información Básica</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">DNI *</label>
                          <input
                            type="text"
                            name="dni"
                            value={personForm.dni}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                          <input
                            type="text"
                            name="nombre"
                            value={personForm.nombre}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico *</label>
                          <input
                            type="email"
                            name="correo"
                            value={personForm.correo}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Celular</label>
                          <input
                            type="tel"
                            name="celular"
                            value={personForm.celular}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Work Information */}
                  {(activeSection === 'work' || !activeSection) && (
                    <div className="space-y-4 mt-6">
                      <h3 className="font-medium text-gray-700 border-b pb-2">Datos Laborales</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ocupación *</label>
                          <input
                            type="text"
                            name="ocupacion"
                            value={personForm.ocupacion}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Salario *</label>
                          <input
                            type="number"
                            name="salario"
                            value={personForm.salario}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Ingreso *</label>
                          <input
                            type="date"
                            name="fechaingreso"
                            value={personForm.fechaingreso}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Sede *</label>
                          <select
                            name="sede"
                            value={personForm.sede}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="Andahuaylas">Andahuaylas</option>
                            <option value="Ayacucho">Ayacucho</option>
                            <option value="Callao">Callao</option>
                            <option value="Huacho">Huacho</option>
                            <option value="Huancavelica">Huancavelica</option>
                            <option value="Ica">Ica</option>
                            <option value="Independencia">Independencia</option>
                            <option value="La Molina">La Molina</option>
                            <option value="SMP">San Martín de Porres (SMP)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Empresa *</label>
                          <select
                            name="empresa"
                            value={personForm.empresa}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="BREVETES APURIMAC SAC">BREVETES APURIMAC SAC</option>
                            <option value="MI BREVETE SEGURO SAC">MI BREVETE SEGURO SAC</option>
                            <option value="RTP SAN CRISTÓBAL SAC">RTP SAN CRISTÓBAL SAC</option>
                            <option value="RTV SAN CRISTÓBAL SAC">RTV SAN CRISTÓBAL SAC</option>
                            <option value="SAN CRISTÓBAL DEL PERÚ SAC">SAN CRISTÓBAL DEL PERÚ SAC</option>
                            <option value="SAN CRISTÓBAL VIP SAC">SAN CRISTÓBAL VIP SAC</option>
                            <option value="SAN LUIS MEDIC SAC">SAN LUIS MEDIC SAC</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Rubro *</label>
                          <select
                            name="rubro"
                            value={personForm.rubro}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="CITV">CITV</option>
                            <option value="ECSAL">ECSAL</option>
                            <option value="ESCON">ESCON</option>
                            <option value="Central">Central</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Días de Vacaciones *</label>
                          <input
                            type="number"
                            name="vacaciones"
                            value={personForm.vacaciones}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            name="activo"
                            checked={personForm.activo}
                            onChange={handlePersonFormChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label className="ml-2 block text-sm text-gray-700">Activo</label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Personal Information */}
                  {(activeSection === 'personal' || !activeSection) && (
                    <div className="space-y-4 mt-6">
                      <h3 className="font-medium text-gray-700 border-b pb-2">Datos Personales</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento *</label>
                          <input
                            type="date"
                            name="fechanacimiento"
                            value={personForm.fechanacimiento}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nacionalidad</label>
                          <input
                            type="text"
                            name="nacionalidad"
                            value={personForm.nacionalidad}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil *</label>
                          <select
                            name="estadocivil"
                            value={personForm.estadocivil}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="soltero">Soltero</option>
                            <option value="casado">Casado</option>
                            <option value="divorciado">Divorciado</option>
                            <option value="viudo">Viudo</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Número de Hijos</label>
                          <input
                            type="number"
                            name="numerohijos"
                            value={personForm.numerohijos}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Contacto de Emergencia</label>
                          <input
                            type="text"
                            name="contactoemergencia"
                            value={personForm.contactoemergencia}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nivel Educativo *</label>
                          <select
                            name="niveleducativo"
                            value={personForm.niveleducativo}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="secundaria">Secundaria</option>
                            <option value="tecnico">Técnico</option>
                            <option value="universitario">Universitario</option>
                            <option value="posgrado">Posgrado</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Carrera/Especialidad</label>
                          <input
                            type="text"
                            name="carreraespecialidad"
                            value={personForm.carreraespecialidad}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bank Information */}
                  {(activeSection === 'bank' || !activeSection) && (
                    <div className="space-y-4 mt-6">
                      <h3 className="font-medium text-gray-700 border-b pb-2">Datos Bancarios</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Banco *</label>
                          <input
                            type="text"
                            name="banco"
                            value={personForm.banco}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Número de Cuenta *</label>
                          <input
                            type="text"
                            name="numerocuenta"
                            value={personForm.numerocuenta}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cuenta *</label>
                          <select
                            name="tipocuenta"
                            value={personForm.tipocuenta}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="ahorros">Ahorros</option>
                            <option value="corriente">Corriente</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Interbancaria</label>
                          <input
                            type="text"
                            name="cuentainterbancaria"
                            value={personForm.cuentainterbancaria}
                            onChange={handlePersonFormChange}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingId ? 'Actualizar Empleado' : 'Registrar Empleado'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeopleManagement;