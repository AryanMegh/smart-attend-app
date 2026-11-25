import React, { useContext, type ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactElement;
}

/** Wraps any route that requires a signed-in user. */
const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const ctx = useContext(AuthContext);
  const location = useLocation();

  // Prevent UI "flicker": while Firebase restores the session, show a loader
  if (!ctx || ctx.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#1f1b16]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#f5c27a] border-t-transparent"></div>
        <p className="ml-3 text-[#f5c27a] font-semibold">Verifying Session...</p>
      </div>
    );
  }

  // Not signed in: redirect to /login, remembering where they were headed
  if (!ctx.isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
