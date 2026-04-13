import { createContext, useContext } from "react";
import type { Lang } from "../constants/classDescriptions";

export const LangContext = createContext<Lang>("en");
export const useLang = () => useContext(LangContext);
