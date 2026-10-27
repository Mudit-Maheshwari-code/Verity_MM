import { Routes, Route } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import ResultsPage from './pages/ResultsPage';
import AboutPage from './pages/AboutPage';
import Nav from './components/Nav';

function App() {
  return (
    <div className="app-root">
      <Nav />
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </div>
  );
}
export default App;
