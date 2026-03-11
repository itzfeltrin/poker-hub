import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  useLocationsQuery,
  useDeleteLocationMutation,
  type LocationWithGameCount,
} from "@/api/hooks";
import { Plus, Trash2, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Container,
  Lockup,
  Grid,
  Button,
} from "@poker-hub/design-system";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function LocationsPage() {
  const { data: locations = [] } = useLocationsQuery();
  const deleteLocationMut = useDeleteLocationMutation();
  const [deleteTarget, setDeleteTarget] = useState<LocationWithGameCount | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteLocationMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Local excluído com sucesso");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao excluir local");
        setDeleteTarget(null);
      },
    });
  };

  return (
    <Container size="full">
      <div className="flex items-end justify-between">
        <Lockup>
          <Lockup.Title>Locais</Lockup.Title>
          <Lockup.Subtitle>Gerencie os locais das partidas.</Lockup.Subtitle>
        </Lockup>
        <Button asChild>
          <Link to="/locations/new">
            <Plus className="h-4 w-4 mr-2" />
            Novo local
          </Link>
        </Button>
      </div>

      <Grid cols={4}>
        <AnimatePresence>
          {locations.map((location) => (
            <motion.div
              key={location.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Link
                to="/locations/$locationId"
                params={{ locationId: location.id }}
                className="block rounded-xl border border-border bg-card p-5 card-hover transition-colors hover:border-primary/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold truncate">
                      {location.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {location.gameCount} {location.gameCount === 1 ? "partida" : "partidas"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-loss shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteTarget(location);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </Grid>

      {locations.length === 0 && (
        <p className="text-muted-foreground text-center py-16">
          Nenhum local cadastrado ainda.
        </p>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir local</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o local "{deleteTarget?.name}"?
              {deleteTarget && deleteTarget.gameCount > 0 && (
                <span className="block mt-2 text-destructive">
                  Este local tem {deleteTarget.gameCount} {deleteTarget.gameCount === 1 ? "partida associada" : "partidas associadas"} e não pode ser excluído.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLocationMut.isPending || (deleteTarget?.gameCount ?? 0) > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLocationMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}
