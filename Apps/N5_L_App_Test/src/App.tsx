import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { LoginScreen } from './components/LoginScreen';
import { StudentScreen } from './components/StudentScreen';
import { TeacherScreen } from './components/TeacherScreen';
import { AdminScreen } from './components/AdminScreen';

function App() {
  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route path="/student" element={<StudentScreen />} />
          {/* ↓ インポートした本格的な TeacherScreen コンポーネントを割り当てます */}
          <Route path="/teacher" element={<TeacherScreen />} />
          <Route path="/admin" element={<AdminScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;