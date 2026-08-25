// Convenenience wrapper: can type useAuth() instead of useContext(AuthContext);

import { useContext } from "react";
import { AuthContext } from "./AuthContext";

export function useAuth() {
  return useContext(AuthContext);
}