import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { companyApi } from '../api/index';
import { useAuth } from './AuthContext';
import { getApiUrl } from '../utils/helpers';

const CompanyContext = createContext(null);

// Company details (name, logo, address…) loaded once after login and shared by the sidebar / profile page
export const CompanyProvider = ({ children }) => {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);

  const refreshCompany = useCallback(async () => {
    try {
      const { data } = await companyApi.get();
      setCompany(data.data);
    } catch {
      setCompany(null);
    }
  }, []);

  useEffect(() => {
    if (user) refreshCompany();
    else setCompany(null);
  }, [user, refreshCompany]);

  const logoUrl = company?.logo ? getApiUrl(`uploads/photos/${company.logo}`) : null;

  return (
    <CompanyContext.Provider value={{ company, logoUrl, setCompany, refreshCompany }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider');
  return ctx;
};
