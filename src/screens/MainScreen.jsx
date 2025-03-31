import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Highcharts from 'highcharts';
import HighchartsAccessibility from 'highcharts/modules/accessibility';
import HighchartsReact from 'highcharts-react-official';
import './MainScreen.css';
import { useNavigate } from 'react-router-dom';

HighchartsAccessibility(Highcharts);


const MainScreen = () => {
  const [mozos, setMozos] = useState([]); // Lista de mozos
  const [reporte, setReporte] = useState(null); // Reporte a mostrar
  const [selectedMozo, setSelectedMozo] = useState(''); // Mozo seleccionado
  const [currentView, setCurrentView] = useState(''); // Vista actual
  const [loading, setLoading] = useState(false); // Estado de carga
  const [error, setError] = useState(null); // Estado de error
  const [categoria, setCategoria] = useState(''); // Categoría seleccionada
  const [fechaInicio, setFechaInicio] = useState(''); // Fecha de inicio
  const [fechaFin, setFechaFin] = useState(''); // Fecha de fin
  const [categoriaAplicada, setCategoriaAplicada] = useState(''); // Nueva variable de estado

  const navigate = useNavigate();
  const handleIrANuevaVentana = () => {
    navigate("/cocinero")};

  useEffect(() => {
    // Obtener la lista de mozos
    const fetchMozos = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/mozos');
        setMozos(response.data);
      } catch (error) {
        console.error('Error al obtener la lista de mozos:', error);
        setError('Error al obtener la lista de mozos.');
      }
    };

    fetchMozos();
  }, []);

  const fetchReporte = async () => {
    setLoading(true);
    setError(null);

    // Validaciones para el reporte de platos
    if (currentView === 'platos') {
      if (!categoria) {
        setError('Por favor, selecciona una categoría.');
        setLoading(false);
        return;
      }

      if (!fechaInicio || !fechaFin) {
        setError('Por favor, selecciona una fecha de inicio y una fecha de fin.');
        setLoading(false);
        return;
      }
  
      if (new Date(fechaFin) < new Date(fechaInicio)) {
        setError('La fecha de fin debe ser mayor o igual a la fecha de inicio.');
        setLoading(false);
        return;
      }
    }

    try {
      const response = await axios.get('http://localhost:8080/api/platillos/filtro', {
        params: {
          fechaInicio,
          fechaFin,
          categoria,
        },
      });
      setReporte(response.data);
      setCategoriaAplicada(categoria); // Actualiza la categoría aplicada al hacer clic en "Aplicar Filtros"
    } catch (error) {
      console.error('Error al obtener el reporte:', error);
      setError('Error al obtener el reporte.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerIndividualMozo = () => {
    // Validación para verificar que se haya seleccionado un mozo
    if (!selectedMozo) {
      setError('Por favor, selecciona un mozo.');
      setLoading(false);
      return;
    }

    // Restablecer el reporte y el error
    setReporte(null);
    setError(null);

    setCurrentView('individual'); // Cambia a la vista individual

    // Ajustar la lógica aquí para obtener el reporte individual
    fetchReporteIndividual();
  };

  const fetchReporteIndividual = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://localhost:8080/api/mozos/${selectedMozo}`);
      setReporte(response.data);
    } catch (error) {
      console.error('Error al obtener el reporte del mozo:', error);
      setError('Error al obtener el reporte del mozo.');
    } finally {
      setLoading(false);
    }
  };

  const handleReportePlatos = () => {
    // Restablecer el reporte y el error
    setReporte(null);
    setError(null);

    setCurrentView('platos'); // Cambia a la vista de platos
    fetchReporte(); // Obtener el reporte de platos con filtros
  };

  const handleReporteClientes = () => {
    // Restablecer el reporte y el error
    setReporte(null);
    setError(null);

    setCurrentView('clientes'); // Cambia a la vista de clientes
    fetchReporteClientes(); // Obtener el reporte de clientes
  };

  const fetchReporteClientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:8080/api/clientes');
      setReporte(response.data);
    } catch (error) {
      console.error('Error al obtener el reporte de clientes:', error);
      setError('Error al obtener el reporte de clientes.');
    } finally {
      setLoading(false);
    }
  };

  const handleReporteVentas = () => {
    // Restablecer el reporte y el error
    setReporte(null);
    setError(null);

    setCurrentView('ventas'); // Cambia a la vista de ventas
    fetchReporteVentas(); // Obtener el reporte de ventas
  };

  const fetchReporteVentas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:8080/api/reportes/ventas', {
        params: {
          fechaInicio:"2024-10-02",
          fechaFin:"2024-10-12",
          },
        });
      setReporte(response.data);
    } catch (error) {
      console.error('Error al obtener el reporte de ventas:', error);
      setError('Error al obtener el reporte de ventas.');
    } finally {
      setLoading(false);
    }
  };

  const renderReporte = () => {
    if (!reporte) return <p>Selecciona un reporte para ver los datos.</p>;

    // Configurar opciones de gráfico
    let chartOptions;

    if (currentView === "ventas") {
      // Agrupar ventas por fecha para la vista de ventas
      const reporteAgrupado = reporte.reduce((acc, item) => {
        const fecha = new Date(item.fecha).toLocaleDateString(); // Convertir a solo fecha (día, mes, año)
        const venta = item.totalVentas;
        acc[fecha] = (acc[fecha] || 0 ) + item.totalVentas;
        return acc;
      }, {});

    // Convertimos el objeto agrupado a un array para el gráfico de ventas
    const fechas = Object.keys(reporteAgrupado); // Fechas únicas
    const ventasTotales = Object.values(reporteAgrupado); // Ventas totales para cada fecha

    chartOptions = {
      chart: { type: 'column',},
      title: { text: `Reporte - Ventas`,},
      xAxis: { categories: fechas, // Usar las fechas agrupadas
        },

      yAxis:{ title:{ text : 'Ventas en soles S/.'}},
      series: [{ name: 'Ventas', data: ventasTotales, // Usar los datos agrupados de ventas totales
          colorByPoint: true,},],
    };
    
  } else if (currentView === 'platos') {
    chartOptions = {
      chart: { type: 'column' },
      title: { text: 'Reporte - Platos' },
      xAxis: {
        categories: reporte.map((item) => item.nombrePlatillo),
      },
      yAxis:{ title:{text:'Cantidad de pedidos'}},
      series: [
        { name: 'Cantidad Pedidos', data: reporte.map((item) => item.cantidadPedidos),
          colorByPoint: true,},],
    };
  }
    return (
      <div className="dashboard">
        {currentView === 'platos' && (
          <HighchartsReact highcharts={Highcharts} options={chartOptions} />
        )}
        {currentView === 'clientes' && (
          <div className="card">
            <h3>Clientes</h3>
            {reporte.map((cliente) => (
              <div key={cliente.id}>
                <p>Nombre: {cliente.nombre}</p>
                <p>Email: {cliente.email}</p>
              </div>
            ))}
          </div>
        )}
        {currentView === 'ventas' &&  (
          <HighchartsReact highcharts={Highcharts} options={chartOptions} />
        )}
      </div>
    );
  };

  return (
    <div className="reportes-container">
      <h2>Reportes de Mozos, Platos, Clientes y Ventas</h2>

      <div className="selector-mozo-container">
        <label htmlFor="mozo-select">Seleccionar Mozo:</label>
        <select
          id="mozo-select"
          value={selectedMozo}
          onChange={(e) => setSelectedMozo(e.target.value)}
          disabled={loading}
        >
          <option value="">Seleccionar Mozo</option>
          {mozos.map((mozo) => (
            <option key={mozo.id} value={mozo.id}>
              {mozo.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="botones-container">
        <button type="button" className="btn" onClick={handleVerIndividualMozo} disabled={!selectedMozo || loading}>
          <strong>Ver reporte de Mozo</strong>
        </button>

        <button type="button" className="btn" onClick={handleReportePlatos} disabled={loading}>
          <strong>Ver reporte de Platos</strong>
        </button>

        <button type="button" className="btn" onClick={handleReporteClientes} disabled={loading}>
          <strong>Ver reporte de Clientes</strong>
        </button>

        <button type="button" className="btn" onClick={handleReporteVentas} disabled={loading}>
          <strong>Ver reporte de Ventas</strong>
        </button>

        <button type="button" className="btn" onClick={handleIrANuevaVentana}>
          <strong>Ver Cocinero</strong>
        </button>

      </div>

      {/* Formulario para Filtrar por Categoria y Fecha */}
      {currentView === 'platos' && (
        <div className="filter-container">
          <h3>Filtrar por Categoría y Fecha</h3>
          <select onChange={(e) => setCategoria(e.target.value)} value={categoria}>
            <option value="">Seleccionar Categoría</option>
            <option value="Sopa">Sopa</option>
            <option value="Segundo">Segundo</option>
            <option value="Postre">Postre</option>
            <option value="Ensalada">Ensalada</option>
            <option value="Bebida">Bebida</option>
          </select>
          <div className="date-filters">
            <label htmlFor="fecha-inicio">Selecciona Fecha Inicio:</label>
            <input 
              id="fecha-inicio"
              type="date" 
              value={fechaInicio} 
              onChange={(e) => setFechaInicio(e.target.value)} 
            />
            <label htmlFor="fecha-fin">Selecciona Fecha Fin:</label>
            <input 
              id="fecha-fin"
              type="date" 
              value={fechaFin} 
              onChange={(e) => setFechaFin(e.target.value)} 
            />
          </div>
          <button className="btn-aplicar-filtros" onClick={handleReportePlatos}>
            Aplicar Filtros
            </button>
        </div>
      )}

      {loading && <p>Cargando...</p>}
      {error && <p className="error-message">{error}</p>}

      {renderReporte()}
    </div>
    
  );
};
export default MainScreen;
