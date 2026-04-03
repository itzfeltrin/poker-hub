import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  useGroupsQuery,
  useDeleteGroupMutation,
  type GroupWithGameCount,
} from "@/api/hooks";
import { Plus, Trash2, UsersRound } from "lucide-react";
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

export default function GroupsPage() {
  const { data: groupList = [] } = useGroupsQuery();
  const deleteGroupMut = useDeleteGroupMutation();
  const [deleteTarget, setDeleteTarget] = useState<GroupWithGameCount | null>(null);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteGroupMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Grupo excluído com sucesso");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "Erro ao excluir grupo",
        );
        setDeleteTarget(null);
      },
    });
  };

  return (
    <Container size="full">
      <div className="flex items-end justify-between">
        <Lockup>
          <Lockup.Title>Grupos</Lockup.Title>
          <Lockup.Subtitle>Gerencie mesas e elencos de jogadores.</Lockup.Subtitle>
        </Lockup>
        <Button asChild>
          <Link to="/groups/new">
            <Plus className="h-4 w-4 mr-2" />
            Novo grupo
          </Link>
        </Button>
      </div>

      <Grid cols={4}>
        <AnimatePresence>
          {groupList.map((group) => (
            <motion.div
              key={group.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Link
                to="/groups/$groupId"
                params={{ groupId: group.id }}
                className="block rounded-xl border border-border bg-card p-5 card-hover transition-colors hover:border-primary/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <UsersRound className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold truncate">
                      {group.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {group.gameCount}{" "}
                      {group.gameCount === 1 ? "partida" : "partidas"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-loss shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteTarget(group);
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

      {groupList.length === 0 && (
        <p className="text-muted-foreground text-center py-16">
          Nenhum grupo cadastrado ainda.
        </p>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o grupo &quot;{deleteTarget?.name}&quot;?
              {deleteTarget && deleteTarget.gameCount > 0 && (
                <span className="block mt-2 text-destructive">
                  Este grupo tem {deleteTarget.gameCount}{" "}
                  {deleteTarget.gameCount === 1
                    ? "partida associada"
                    : "partidas associadas"}{" "}
                  e não pode ser excluído.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={
                deleteGroupMut.isPending || (deleteTarget?.gameCount ?? 0) > 0
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGroupMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}
