import { createContext, useContext } from "react";
export const ClinicContext = createContext(null);
export const useClinic = () => useContext(ClinicContext);
