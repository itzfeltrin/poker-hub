import {
  usePlayersQuery,
  useCreateGameMutation,
  useGroupsQuery,
  useGroupMembersQuery,
} from "@/api/hooks";
import { useGroupScope } from "@/contexts/GroupContext";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { LocationCombobox } from "@/components/LocationCombobox";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import type { ApiGameCreate } from "@poker-hub/db";
import * as R from "remeda";
import {
  Container,
  Lockup,
  Grid,
  FormControl,
  Button,
  Input,
  Label,
  Checkbox,
} from "@poker-hub/design-system";

const formSchema = z.object({
  groupId: z.preprocess((val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    if (typeof val === "string" && val.trim() === "") return undefined;
    return val;
  }, z.union([z.undefined(), z.string().uuid("Grupo inválido")])),
  date: z.coerce.date(),
  locationId: z.string().nullable(),
  buyIn: z.number().min(0, "Entrada é obrigatória"),
  chipsPerPlayer: z.number().min(1, "Número de fichas é obrigatório"),
  playerIds: z
    .array(z.string().uuid())
    .min(1, "Selecione pelo menos um jogador"),
});

type FormData = z.infer<typeof formSchema>;

const defaultValues = {
  groupId: "",
  date: new Date(),
  locationId: null as string | null,
  buyIn: 0,
  chipsPerPlayer: 0,
  playerIds: [] as string[],
};

export default function NewGamePage() {
  const { data: players = [] } = usePlayersQuery();
  const { data: groups = [] } = useGroupsQuery();
  const { selectedGroupId } = useGroupScope();
  const createGameMut = useCreateGameMutation();
  const navigate = useNavigate();
  const lastAppliedGroupRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    control,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues,
    resolver: zodResolver(formSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (selectedGroupId) {
      setValue("groupId", selectedGroupId);
    }
  }, [selectedGroupId, setValue]);

  const rawGroupId = watch("groupId");
  const formGroupId =
    typeof rawGroupId === "string" && rawGroupId.trim() !== ""
      ? rawGroupId.trim()
      : undefined;

  const { data: groupMembers = [] } = useGroupMembersQuery(formGroupId);

  useEffect(() => {
    if (!formGroupId) {
      lastAppliedGroupRef.current = null;
      return;
    }
    if (!groupMembers.length) return;
    if (groupMembers.some((m) => m.groupId !== formGroupId)) return;
    if (lastAppliedGroupRef.current === formGroupId) return;

    setValue(
      "playerIds",
      R.pipe(groupMembers, R.map((m) => m.playerId)),
    );
    lastAppliedGroupRef.current = formGroupId;
  }, [formGroupId, groupMembers, setValue]);

  const selectedIds = watch("playerIds") ?? [];

  const togglePlayer = (id: string) => {
    const current = getValues("playerIds") ?? [];
    setValue(
      "playerIds",
      current.includes(id)
        ? R.filter(current, (x) => x !== id)
        : [...current, id],
    );
  };

  const onSubmit = async (data: FormData) => {
    const payload: ApiGameCreate = {
      buyIn: data.buyIn,
      chipsPerPlayer: data.chipsPerPlayer,
      playerIds: data.playerIds,
      locationId: data.locationId ?? undefined,
      date: data.date.toISOString(),
    };
    if (data.groupId) {
      payload.groupId = data.groupId;
    }

    try {
      await createGameMut.mutateAsync(payload);
      toast.success("Partida registrada!");
      navigate({ to: "/history" });
    } catch {
      toast.error("Falha ao salvar partida");
    }
  };

  return (
    <Container size="md">
      <Lockup>
        <Lockup.Title>Registrar partida</Lockup.Title>
        <Lockup.Subtitle>Registre o resultado da sua sessão.</Lockup.Subtitle>
      </Lockup>

      <Grid cols={2}>
        <FormControl label="Grupo" className="md:col-span-2">
          <select
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
            {...register("groupId")}
            aria-invalid={!!errors.groupId}
          >
            <option value="">Automático (pelo elenco de jogadores)</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          {errors.groupId && (
            <p className="text-sm text-destructive">{errors.groupId.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Se vazio, o sistema encontra ou cria um grupo com exatamente os
            jogadores marcados. Ao escolher um grupo, os membros são
            pré-selecionados.
          </p>
        </FormControl>
        <FormControl label="Data">
          <Input
            {...register("date", { valueAsDate: true })}
            type="date"
            className="bg-card"
            tabIndex={1}
            aria-invalid={!!errors.date}
          />
          {errors.date && (
            <p className="text-sm text-destructive">{errors.date.message}</p>
          )}
        </FormControl>
        <FormControl label="Local">
          <Controller
            name="locationId"
            control={control}
            render={({ field }) => (
              <LocationCombobox
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </FormControl>
        <FormControl label="Entrada (R$)">
          <Input
            type="number"
            inputMode="decimal"
            step={0.1}
            min={0}
            placeholder="0,00"
            {...register("buyIn", { valueAsNumber: true })}
            className="bg-card"
            tabIndex={3}
          />
        </FormControl>
        <FormControl label="Número de fichas">
          <Input
            type="number"
            inputMode="numeric"
            step={50}
            min={1}
            placeholder="Ex: 1000"
            {...register("chipsPerPlayer", { valueAsNumber: true })}
            className="bg-card"
            tabIndex={4}
          />
        </FormControl>
      </Grid>

      <div className="space-y-4">
        <div>
          <Label className="text-base">Jogadores</Label>
          {errors.playerIds && (
            <p className="text-sm text-destructive mt-1">
              {errors.playerIds.message}
            </p>
          )}
        </div>
        <div className="space-y-3">
          {players.map((player) => {
            const selected = selectedIds.includes(player.id);
            return (
              <div
                key={player.id}
                className={`rounded-xl border p-4 transition-all ${
                  selected
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={() => togglePlayer(player.id)}
                    tabIndex={5}
                  />
                  <PlayerAvatar name={player.name} size="sm" />
                  <span className="font-medium flex-1">{player.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Button
        onClick={handleSubmit(onSubmit)}
        className="w-full sm:w-auto mt-6"
        size="lg"
      >
        Salvar partida
      </Button>
    </Container>
  );
}
