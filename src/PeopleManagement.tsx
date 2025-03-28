import React, { useState } from 'react';
import { PlusCircle, Edit2, Trash2, FileUp, FileDown, Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format, parseISO } from 'date-fns';

interface Person {
  id: string;
  dni: string;
  nombre: string;
  ocupacion: string;
  salario: number;
  fechaIngreso: string;
  activo: boolean;
  sede: string;
  planta: string;
  celular: string;
  correo: string;
  vacaciones: number;
  estadoCivil: 'soltero' | 'casado' | 'divorciado' | 'viudo';
  numeroHijos: number;
  fechaNacimiento: string;
  nacionalidad: string;
  banco: string;
  numeroCuenta: string;
  tipoCuenta: 'ahorros' | 'corriente';
  cuentaInterbancaria: string;
  contactoEmergencia: string;
  nivelEducativo: 'secundaria' | 'tecnico' | 'universitario' | 'posgrado';
  carreraEspecialidad: string;
}

const PeopleManagement: React.FC = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [personForm, setPersonForm] = useState<Person>({
    id: '',
    dni: '',
    nombre: '',
    ocupacion: '',
    salario: 0,
    fechaIngreso: format(new Date(), 'yyyy-MM-dd'),
    activo: true,
    sede: '',
    planta: '',
    celular: '',
    correo: '',
    vacaciones: 0,
    estadoCivil: 'soltero',
    numeroHijos: 0,
    fechaNacimiento: '',
    nacionalidad: '',
    banco: '',
    numeroCuenta: '',
    tipoCuenta: 'ahorros',
    cuentaInterbancaria: '',
    contactoEmergencia: '',
    nivelEducativo: 'secundaria',
    carreraEspecialidad: ''
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterField, setFilterField] = useState<string>('all');
  const [activeSection, setActiveSection] = useState<string>('basic');
  const [showFilters, setShowFilters] = useState(false);

  const handlePersonFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setPersonForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : type === 'number'
        ? Number(value)
        : value
    }));
  };

  const handlePersonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      setPeople(people.map(p => p.id === editing ? personForm : p));
    } else {
      setPeople([...people, { ...personForm, id: Date.now().toString() }]);
    }
    setPersonForm({
      id: '',
      dni: '',
      nombre: '',
      ocupacion: '',
      salario: 0,
      fechaIngreso: format(new Date(), 'yyyy-MM-dd'),
      activo: true,
      sede: '',
      planta: '',
      celular: '',
      correo: '',
      vacaciones: 0,
      estadoCivil: 'soltero',
      numeroHijos: 0,
      fechaNacimiento: '',
      nacionalidad: '',
      banco: '',
      numeroCuenta: '',
      tipoCuenta: 'ahorros',
      cuentaInterbancaria: '',
      contactoEmergencia: '',
      nivelEducativo: 'secundaria',
      carreraEspecialidad: ''
    });
    setEditing(null);
  };

  const handlePersonDelete = (id: string) => {
    if (window.confirm('¿Está seguro que desea eliminar este registro?')) {
      setPeople(people.filter(p => p.id !== id));
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const newPeople = jsonData
        .filter((p: any) => p.DNI && p.Nombre && p.Ocupación)
        .map((p: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          dni: p.DNI.toString(),
          nombre: p.Nombre,
          ocupacion: p.Ocupación,
          salario: p.Salario || 0,
          fechaIngreso: p['Fecha Ingreso'] ? format(parseISO(p['Fecha Ingreso']), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          activo: p.Activo === 'Sí',
          sede: p.Sede || '',
          planta: p.Planta || '',
          celular: p.Celular || '',
          correo: p.Correo || '',
          vacaciones: p.Vacaciones || 0,
          estadoCivil: p['Estado Civil'] || 'soltero',
          numeroHijos: p['Número de hijos'] || 0,
          fechaNacimiento: p['Fecha de nacimiento'] ? format(parseISO(p['Fecha de nacimiento']), 'yyyy-MM-dd') : '',
          nacionalidad: p.Nacionalidad || '',
          banco: p.Banco || '',
          numeroCuenta: p['Número de cuenta'] || '',
          tipoCuenta: p['Tipo de cuenta'] || 'ahorros',
          cuentaInterbancaria: p['Cuenta interbancaria'] || '',
          contactoEmergencia: p['Contacto de emergencia'] || '',
          nivelEducativo: p['Nivel educativo'] || 'secundaria',
          carreraEspecialidad: p['Carrera o especialidad'] || ''
        }));
      setPeople(prev => [...prev, ...newPeople]);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExport = () => {
    const data = people.map(p => ({
      DNI: p.dni,
      Nombre: p.nombre,
      Ocupación: p.ocupacion,
      Salario: p.salario,
      'Fecha Ingreso': p.fechaIngreso,
      Activo: p.activo ? 'Sí' : 'No',
      Sede: p.sede,
      Planta: p.planta,
      Celular: p.celular,
      Correo: p.correo,
      Vacaciones: p.vacaciones,
      'Estado Civil': p.estadoCivil,
      'Número de hijos': p.numeroHijos,
      'Fecha de nacimiento': p.fechaNacimiento,
      Nacionalidad: p.nacionalidad,
      Banco: p.banco,
      'Número de cuenta': p.numeroCuenta,
      'Tipo de cuenta': p.tipoCuenta,
      'Cuenta interbancaria': p.cuentaInterbancaria,
      'Contacto de emergencia': p.contactoEmergencia,
      'Nivel educativo': p.nivelEducativo,
      'Carrera o especialidad': p.carreraEspecialidad
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Personal');
    XLSX.writeFile(workbook, `Personal_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const filteredPeople = people.filter(p => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    
    if (filterField === 'all') {
      return Object.values(p).some(v => 
        v?.toString().toLowerCase().includes(term)
      );
    } else {
      const value = p[filterField as keyof Person]?.toString().toLowerCase() || '';
      return value.includes(term);
    }
  });

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? '' : section);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                        <option value="planta">Planta</option>
                        <option value="correo">Correo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">Todos</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sede</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="all">Todas</option>
                        <option value="lima">Lima</option>
                        <option value="provincia">Provincia</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form and Table */}
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Form Section */}
              <div className="lg:w-1/2">
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">
                      {editing ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
                    </h2>
                  </div>
                  <form onSubmit={handlePersonSubmit} className="p-6">
                    {/* Form Sections */}
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
                                name="fechaIngreso"
                                value={personForm.fechaIngreso}
                                onChange={handlePersonFormChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Sede *</label>
                              <input
                                type="text"
                                name="sede"
                                value={personForm.sede}
                                onChange={handlePersonFormChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Planta</label>
                              <input
                                type="text"
                                name="planta"
                                value={personForm.planta}
                                onChange={handlePersonFormChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                              <input
                                type="date"
                                name="fechaNacimiento"
                                value={personForm.fechaNacimiento}
                                onChange={handlePersonFormChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                              <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
                              <select
                                name="estadoCivil"
                                value={personForm.estadoCivil}
                                onChange={handlePersonFormChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                                name="numeroHijos"
                                value={personForm.numeroHijos}
                                onChange={handlePersonFormChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Contacto de Emergencia</label>
                              <input
                                type="text"
                                name="contactoEmergencia"
                                value={personForm.contactoEmergencia}
                                onChange={handlePersonFormChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nivel Educativo</label>
                              <select
                                name="nivelEducativo"
                                value={personForm.nivelEducativo}
                                onChange={handlePersonFormChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
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
                                name="carreraEspecialidad"
                                value={personForm.carreraEspecialidad}
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
                              <label className="block text-sm font-medium text-gray-700 mb-1">Banco</label>
                              <input
                                type="text"
                                name="banco"
                                value={personForm.banco}
                                onChange={handlePersonFormChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Número de Cuenta</label>
                              <input
                                type="text"
                                name="numeroCuenta"
                                value={personForm.numeroCuenta}
                                onChange={handlePersonFormChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cuenta</label>
                              <select
                                name="tipoCuenta"
                                value={personForm.tipoCuenta}
                                onChange={handlePersonFormChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="ahorros">Ahorros</option>
                                <option value="corriente">Corriente</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta Interbancaria</label>
                              <input
                                type="text"
                                name="cuentaInterbancaria"
                                value={personForm.cuentaInterbancaria}
                                onChange={handlePersonFormChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                      >
                        {editing ? 'Actualizar Empleado' : 'Registrar Empleado'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Table Section */}
              <div className="lg:w-1/2">
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800">Listado de Personal</h2>
                    <span className="text-sm text-gray-500">
                      {filteredPeople.length} de {people.length} registros
                    </span>
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
                        {filteredPeople.length > 0 ? (
                          filteredPeople.map(person => (
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
                                <div className="text-sm text-gray-500">{person.planta}</div>
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
                                      setPersonForm(person);
                                      setEditing(person.id);
                                      window.scrollTo({ top: 0, behavior: 'smooth' });
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeopleManagement;