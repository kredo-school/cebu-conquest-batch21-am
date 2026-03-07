import PhaserGame from './components/PhaserGame';

function App() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      backgroundColor: '#0f0f1a'
    }}>
      <PhaserGame />
    </div>
  );
}

export default App;