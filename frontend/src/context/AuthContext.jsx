import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, getStoredToken, loginUser, logoutUser } from "../lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const token = getStoredToken();

    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error("Failed to fetch current user:", error.message);
      logoutUser();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(username, password) {
    await loginUser(username, password);
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    return currentUser;
  }

  function logout() {
    logoutUser();
    setUser(null);
  }

  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}