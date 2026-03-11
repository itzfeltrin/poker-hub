import { useState, useEffect } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  useLocationQuery,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
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
  name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
});

type FormData = z.infer<typeof formSchema>;

export default function LocationDetailsPage() {
  const { locationId } = useParams({ from: "/locations/$locationId" });
  const navigate = useNavigate();
  const { data: location, isLoading, error } = useLocationQuery(locationId);
  const updateLocationMut = useUpdateLocationMutation();
  const deleteLocationMut = useDeleteLocationMutation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    if (location) {
      reset({ name: location.name });
    }
  }, [location, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      await updateLocationMut.mutateAsync({
        id: locationId,
        body: { name: data.name.trim() },
      });
      toast.success("Local atualizado com sucesso!");
      navigate({ to: "/locations" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar local");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLocationMut.mutateAsync(locationId);
      toast.success("Local excluído com sucesso!");
      navigate({ to: "/locations" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir local");
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <Container size="md">
        <p className="text-muted-foreground">Carregando...</p>
      </Container>
    );
  }

  if (error || !location) {
    return (
      <Container size="md">
        <p className="text-destructive">Local não encontrado.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/locations" })}>
          Voltar para locais
        </Button>
      </Container>
    );
  }

  return (
    <Container size="md">
      <Lockup>
        <Lockup.Title>{location.name}</Lockup.Title>
        <Lockup.Subtitle>Edite as informações do local.</Lockup.Subtitle>
      </Lockup>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-md">
        <FormControl label="Nome do local">
          <Input
            placeholder="ex.: Casa do Caio"
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir local</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o local "{location.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLocationMut.isPending}
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
