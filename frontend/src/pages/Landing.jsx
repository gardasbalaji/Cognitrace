import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Landing Page decommissioned:
 * Authentication (Sign In & Sign Up) is now the primary landing experience.
 */
export default function Landing() {
  return <Navigate to="/" replace />;
}
