import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  useGroupQuery,
  useGroupsQuery,
  useGroupMembersQuery,
  usePlayersQuery,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useAddGroupMemberMutation,
  useGroupChampionshipsQuery,
  useCreateChampionshipMutation,
  useDeleteChampionshipMutation,
} from "@/api/hooks";
import { useGroupScope } from "@/contexts/GroupContext";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2, Wallet } from "lucide-react";
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
  const { setSelectedGroupId } = useGroupScope();
  const { data: group, isLoading, error } = useGroupQuery(groupId);
  const { data: groupsWithCounts = [] } = useGroupsQuery();
  const { data: members = [], isLoading: membersLoading } =
    useGroupMembersQuery(groupId);
  const { data: allPlayers = [] } = usePlayersQuery();
  const updateGroupMut = useUpdateGroupMutation();
  const deleteGroupMut = useDeleteGroupMutation();
  const addMemberMut = useAddGroupMemberMutation();
  const { data: championships = [], isLoading: championshipsLoading } =
    useGroupChampionshipsQuery(groupId);
  const createChampionshipMut = useCreateChampionshipMutation(groupId);
  const deleteChampionshipMut = useDeleteChampionshipMutation(groupId);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [playerToAdd, setPlayerToAdd] = useState("");
  const [champName, setChampName] = useState("");
  const [champStart, setChampStart] = useState("");
  const [champEnd, setChampEnd] = useState("");

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

        <div className="flex flex-wrap gap-3 justify-end">
          <Button
            variant="secondary"
            type="button"
            onClick={() => {
              setSelectedGroupId(groupId);
              void navigate({ to: "/ledger" });
            }}
          >
            <Wallet className="h-4 w-4 mr-2" />
            Bolão / extrato
          </Button>
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

      <section className="mt-10 space-y-4 max-w-md">
        <h2 className="text-lg font-display font-semibold">Campeonatos</h2>
        <p className="text-sm text-muted-foreground">
          Períodos deste grupo (ano, semestre, etc.). Na hora de registrar, a
          data sugere o campeonato e a partida fica ligada a ele. O histórico
          geral do grupo continua no filtro do topo. Para dois semestres,
          remova o campeonato anual e crie dois períodos que não se
          sobreponham.
        </p>
        {championshipsLoading && (
          <p className="text-sm text-muted-foreground">
            Carregando campeonatos…
          </p>
        )}
        {!championshipsLoading && championships.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum campeonato neste grupo.
          </p>
        )}
        <ul className="space-y-2">
          {championships.map((row) => (
            <li
              key={row.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{row.name}</p>
                <p className="text-xs text-muted-foreground">
                  {row.startDate} – {row.endDate}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={deleteChampionshipMut.isPending}
                onClick={async () => {
                  try {
                    await deleteChampionshipMut.mutateAsync(row.id);
                    toast.success("Campeonato removido");
                  } catch (err) {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Erro ao excluir campeonato",
                    );
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          <FormControl label="Novo campeonato">
            <Input
              placeholder="ex.: Campeonato 2026.2"
              className="bg-card"
              value={champName}
              onChange={(e) => setChampName(e.target.value)}
            />
          </FormControl>
          <div className="grid grid-cols-2 gap-2">
            <FormControl label="Início">
              <Input
                type="date"
                className="bg-card"
                value={champStart}
                onChange={(e) => setChampStart(e.target.value)}
              />
            </FormControl>
            <FormControl label="Fim">
              <Input
                type="date"
                className="bg-card"
                value={champEnd}
                onChange={(e) => setChampEnd(e.target.value)}
              />
            </FormControl>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={
              !champName.trim() ||
              !champStart ||
              !champEnd ||
              createChampionshipMut.isPending
            }
            onClick={async () => {
              try {
                await createChampionshipMut.mutateAsync({
                  name: champName.trim(),
                  startDate: champStart,
                  endDate: champEnd,
                });
                toast.success("Campeonato criado");
                setChampName("");
                setChampStart("");
                setChampEnd("");
              } catch (err) {
                toast.error(
                  err instanceof Error
                    ? err.message
                    : "Erro ao criar campeonato",
                );
              }
            }}
          >
            {createChampionshipMut.isPending ? "Criando…" : "Adicionar"}
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
