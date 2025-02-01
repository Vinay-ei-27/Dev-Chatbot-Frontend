// src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';

function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  // Check if user is not authenticated
  if (!token || !user) {
    // Redirect to login page with the return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  try {
    // Verify user data is valid JSON
    JSON.parse(user);
  } catch (error) {
	console.log(error);
    // If user data is corrupted, clear storage and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render child components if authenticated
  return children;
}

// PropTypes validation
ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;