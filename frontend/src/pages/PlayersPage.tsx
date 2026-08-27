import { useState } from "react";
import {
  usePlayersQuery,
  useCreatePlayerMutation,
  useDeletePlayerMutation,
  useHistoryQuery,
  useProfitLossQuery,
} from "@/api/hooks";
import { useGroupScope } from "@/contexts/GroupContext";
import { getPlayerPnL, getPlayerGamesCount } from "@/utils/player";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPnl } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Container,
  Lockup,
  Button,
  Input,
  Label,
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

const formSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório"),
});

type FormData = z.infer<typeof formSchema>;

const defaultValues: FormData = {
  name: "",
};

type DeleteTarget = {
  id: string;
  name: string;
  gamesCount: number;
};

export default function PlayersPage() {
  const { selectedGroupId } = useGroupScope();
  const { data: players = [] } = usePlayersQuery();
  const { data: historyGames } = useHistoryQuery(selectedGroupId);
  const { data: profitLoss } = useProfitLossQuery({
    period: "all_time",
    groupId: selectedGroupId,
  });
  const createPlayerMut = useCreatePlayerMutation();
  const deletePlayerMut = useDeletePlayerMutation();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // --- Form ---
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues,
    resolver: zodResolver(formSchema),
  });

  const onSubmit = (data: FormData) => {
    createPlayerMut.mutate(
      { name: data.name.trim() },
      {
        onSuccess: () => reset(),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePlayerMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Jogador excluído com sucesso");
        setDeleteTarget(null);
      },
      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "Erro ao excluir jogador",
        );
        setDeleteTarget(null);
      },
    });
  };

  return (
    <Container size="full">
      <Lockup>
        <Lockup.Title>Jogadores</Lockup.Title>
        <Lockup.Subtitle>Gerencie sua turma de poker.</Lockup.Subtitle>
      </Lockup>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-3 max-w-md"
      >
        <div className="space-y-2">
          <Label htmlFor="player-name">Nome do jogador</Label>
          <div className="flex gap-3">
            <Input
              id="player-name"
              placeholder="Nome do jogador..."
              className="bg-card flex-1"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            <Button type="submit" disabled={isSubmitting}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {players.map((player) => {
            const pnl = getPlayerPnL(profitLoss, player.id);
            const gamesCount = getPlayerGamesCount(
              historyGames,
              player.id,
              selectedGroupId,
            );
            return (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="rounded-xl border border-border bg-card p-5 card-hover flex items-center gap-4"
              >
                <PlayerAvatar name={player.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-semibold text-lg truncate">
                    {player.name}
                  </p>
                  <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                    <span>{gamesCount} partidas</span>
                    <span
                      className={
                        pnl >= 0
                          ? "text-success font-medium"
                          : "text-loss font-medium"
                      }
                    >
                      {formatPnl(pnl)}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-loss shrink-0"
                  aria-label={`Excluir ${player.name}`}
                  onClick={() =>
                    setDeleteTarget({
                      id: player.id,
                      name: player.name,
                      gamesCount,
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir jogador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o jogador &quot;{deleteTarget?.name}&quot;?
              {deleteTarget && deleteTarget.gamesCount > 0 && (
                <span className="block mt-2 text-destructive">
                  Este jogador tem {deleteTarget.gamesCount}{" "}
                  {deleteTarget.gamesCount === 1
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
                deletePlayerMut.isPending || (deleteTarget?.gamesCount ?? 0) > 0
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePlayerMut.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Container>
  );
}
