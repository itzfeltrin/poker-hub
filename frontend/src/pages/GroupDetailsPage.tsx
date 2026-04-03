import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  useGroupQuery,
  useGroupsQuery,
  useGroupMembersQuery,
  usePlayersQuery,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useAddGroupMemberMutation,
} from "@/api/hooks";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Container,
  Lockup,
  FormControl,
  Button,
  Input,
} from "@poker-hub/design-system";
import { PlayerAvatar } from "@/components/PlayerAvatar";
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
import * as R from "remeda";

const formSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
});

type FormData = z.infer<typeof formSchema>;

export default function GroupDetailsPage() {
  const { groupId } = useParams({ from: "/groups/$groupId" });
  const navigate = useNavigate();
  const { data: group, isLoading, error } = useGroupQuery(groupId);
  const { data: groupsWithCounts = [] } = useGroupsQuery();
  const { data: members = [], isLoading: membersLoading } =
    useGroupMembersQuery(groupId);
  const { data: allPlayers = [] } = usePlayersQuery();
  const updateGroupMut = useUpdateGroupMutation();
  const deleteGroupMut = useDeleteGroupMutation();
  const addMemberMut = useAddGroupMemberMutation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [playerToAdd, setPlayerToAdd] = useState("");

  const gameCount = useMemo(
    () => groupsWithCounts.find((g) => g.id === groupId)?.gameCount ?? 0,
    [groupsWithCounts, groupId],
  );

  const memberIds = useMemo(
    () => new Set(R.map(members, (m) => m.playerId)),
    [members],
  );

  const playersNotInGroup = R.pipe(
    allPlayers,
    R.filter((p) => !memberIds.has(p.id)),
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    defaultValues: { name: "" },
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (group) {
      reset({ name: group.name });
    }
  }, [group, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      await updateGroupMut.mutateAsync({
        id: groupId,
        body: { name: data.name.trim() },
      });
      toast.success("Grupo atualizado com sucesso!");
      navigate({ to: "/groups" });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao atualizar grupo",
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteGroupMut.mutateAsync(groupId);
      toast.success("Grupo excluído com sucesso!");
      navigate({ to: "/groups" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir grupo");
      setShowDeleteDialog(false);
    }
  };

  const handleAddMember = async () => {
    if (!playerToAdd) return;
    try {
      await addMemberMut.mutateAsync({ groupId, playerId: playerToAdd });
      toast.success("Jogador adicionado ao grupo");
      setPlayerToAdd("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao adicionar jogador",
      );
    }
  };

  if (isLoading) {
    return (
      <Container size="md">
        <p className="text-muted-foreground">Carregando...</p>
      </Container>
    );
  }

  if (error || !group) {
    return (
      <Container size="md">
        <p className="text-destructive">Grupo não encontrado.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/groups" })}>
          Voltar para grupos
        </Button>
      </Container>
    );
  }

  return (
    <Container size="md">
      <Lockup>
        <Lockup.Title>{group.name}</Lockup.Title>
        <Lockup.Subtitle>
          Edite o nome e os membros do grupo.{" "}
          {gameCount > 0 && (
            <span className="text-muted-foreground">
              {gameCount} {gameCount === 1 ? "partida" : "partidas"} neste grupo.
            </span>
          )}
        </Lockup.Subtitle>
      </Lockup>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
        <FormControl label="Nome do grupo">
          <Input
            placeholder="ex.: Mesa de sexta"
            className="bg-card"
            aria-invalid={!!errors.name}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
          )}
        </FormControl>

        <div className="flex gap-3 justify-end">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>

      <section className="mt-10 space-y-4 max-w-md">
        <h2 className="text-lg font-display font-semibold">Membros</h2>
        {membersLoading && (
          <p className="text-sm text-muted-foreground">Carregando membros…</p>
        )}
        {!membersLoading && members.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum jogador neste grupo. Adicione abaixo ou registre uma partida
            com o elenco desejado (grupo automático).
          </p>
        )}
        <ul className="space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
            >
              <PlayerAvatar name={m.name} size="sm" />
              <span className="font-medium">{m.name}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <FormControl label="Adicionar jogador" className="flex-1">
            <select
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
              value={playerToAdd}
              onChange={(e) => setPlayerToAdd(e.target.value)}
            >
              <option value="">Selecione…</option>
              {playersNotInGroup.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormControl>
          <Button
            type="button"
            variant="secondary"
            disabled={!playerToAdd || addMemberMut.isPending}
            onClick={handleAddMember}
          >
            {addMemberMut.isPending ? "Adicionando…" : "Adicionar"}
          </Button>
        </div>
      </section>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o grupo &quot;{group.name}&quot;?
              Esta ação não pode ser desfeita.
              {gameCount > 0 && (
                <span className="block mt-2 text-destructive">
                  Este grupo tem {gameCount}{" "}
                  {gameCount === 1 ? "partida" : "partidas"} e não pode ser
                  excluído até não haver partidas associadas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteGroupMut.isPending || gameCount > 0}
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
