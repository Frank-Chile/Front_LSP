import React, { useState, useEffect } from 'react';

const Cocinero = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/ordenes');
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        setError('Error al cargar las órdenes.');
      }
    } catch (error) {
      setError('Error de red. No se pudieron cargar las órdenes.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p>Cargando órdenes...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Órdenes</h1>
      {orders.length === 0 ? (
        <p>No hay órdenes registradas.</p>
      ) : (
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>ID Orden</th>
              <th>Cliente</th>
              <th>Total Pago</th>
              <th>Fecha</th>
              <th>Detalle de la Orden</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.idOrden}>
                <td>{order.idOrden}</td>
                <td>{order.cliente.nombre}</td>
                <td>S/. {order.totalPago.toFixed(2)}</td>
                <td>{new Date(order.fecha).toLocaleString()}</td>
                <td>
                  <ul>
                    {order.detalleOrdenes.map((detalle, index) => (
                      <li key={index}>
                        {detalle.producto.nombre} - Cantidad: {detalle.cantidad} - Subtotal: S/.{' '}
                        {detalle.subtotal.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Cocinero;
