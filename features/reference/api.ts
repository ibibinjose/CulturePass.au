import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { qk } from "@/lib/query";

export function useStates() {
  return useQuery({
    queryKey: qk.states,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("australian_states")
        .select("code, name, capital_city, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    staleTime: Infinity, // reference data rarely changes
  });
}

export function useCouncils(stateCode?: string) {
  return useQuery({
    queryKey: qk.councils(stateCode),
    queryFn: async () => {
      let query = supabase
        .from("australian_councils")
        .select("id, name, slug, state_code, is_metro, population")
        .order("name");
      if (stateCode) query = query.eq("state_code", stateCode);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: stateCode === undefined || stateCode.length > 0,
    staleTime: Infinity,
  });
}
