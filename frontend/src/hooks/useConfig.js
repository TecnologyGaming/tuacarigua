import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useConfig = () =>
  useQuery({ queryKey: ["config"], queryFn: async () => (await api.get("/config")).data, staleTime: Infinity });

export const useZones = () =>
  useQuery({ queryKey: ["zones"], queryFn: async () => (await api.get("/zones")).data });

export const useListings = (params) =>
  useQuery({ queryKey: ["listings", params], queryFn: async () => (await api.get("/listings", { params })).data });
