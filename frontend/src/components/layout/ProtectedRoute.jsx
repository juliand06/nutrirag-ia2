import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useNutriStore } from '../../store/useNutriStore';

export default function ProtectedRoute({ children }) {
  const currentUser = useNutriStore(s => s.currentUser);
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
