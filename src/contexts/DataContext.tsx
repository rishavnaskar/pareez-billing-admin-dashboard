"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getBranches,
  getCustomers,
  getAllBills,
  getProducts,
  getEmployees,
} from "@/lib/firestore";
import type { Branch, Customer, Bill, Product, Employee } from "@/lib/types";

interface DataState {
  branches: Branch[];
  customers: Customer[];
  bills: Bill[];
  products: Product[];
  employees: Employee[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  refreshEmployees: () => Promise<void>;
}

const DataContext = createContext<DataState | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [br, cu, bi, pr, em] = await Promise.all([
        getBranches(),
        getCustomers(),
        getAllBills(),
        getProducts().catch(() => []),
        getEmployees().catch(() => []),
      ]);
      setBranches(br);
      setCustomers(cu);
      setBills(bi);
      setProducts(pr);
      setEmployees(em);
      setLastUpdated(new Date());
    } catch (err) {
      setError((err as Error).message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    setProducts(await getProducts().catch(() => []));
  }, []);

  const refreshEmployees = useCallback(async () => {
    setEmployees(await getEmployees().catch(() => []));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <DataContext.Provider
      value={{
        branches,
        customers,
        bills,
        products,
        employees,
        isLoading,
        error,
        lastUpdated,
        refresh,
        refreshProducts,
        refreshEmployees,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
