import HealthCheck from './components/HealthCheck.jsx';

function App() {
  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Icesi Virtual - Frontend</h1>
      <p>Ejemplo de consumo del backend Laravel.</p>
      <HealthCheck />
    </main>
  );
}

export default App;
