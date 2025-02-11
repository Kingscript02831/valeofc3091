
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import type { Database } from "../../types/supabase";
import { toast } from "sonner";

type SiteConfig = Database['public']['Tables']['site_configuration']['Row'];

export function useSiteConfig() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['site-configuration'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_configuration")
        .select("*")
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching site configuration:", error);
        throw error;
      }
      
      if (!data) {
        console.error("No site configuration found");
        throw new Error("No site configuration found");
      }
      
      return data;
    },
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 2,
  });

  const updateConfig = async (newConfig: Partial<SiteConfig>) => {
    try {
      // Verifica se o usuário está autenticado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para fazer alterações");
        return false;
      }

      // Atualiza a configuração
      const { error } = await supabase
        .from("site_configuration")
        .update(newConfig)
        .eq("id", data?.id);

      if (error) {
        console.error("Error updating site configuration:", error);
        if (error.message.includes("row level security")) {
          toast.error("Você não tem permissão para atualizar as configurações");
        } else {
          toast.error("Erro ao atualizar configurações");
        }
        return false;
      }

      // Invalida o cache para forçar uma nova busca
      await queryClient.invalidateQueries({ queryKey: ['site-configuration'] });
      toast.success("Configurações atualizadas com sucesso!");
      return true;
    } catch (error) {
      console.error("Error in updateConfig:", error);
      toast.error("Erro ao atualizar configurações");
      return false;
    }
  };

  return {
    data,
    isLoading,
    isError,
    updateConfig
  };
}
