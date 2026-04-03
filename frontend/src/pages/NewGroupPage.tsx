import { useNavigate } from "@tanstack/react-router";
import { useCreateGroupMutation } from "@/api/hooks";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Container,
  Lockup,
  FormControl,
  Button,
  Input,
} from "@poker-hub/design-system";

const formSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
});

type FormData = z.infer<typeof formSchema>;

const defaultValues: FormData = {
  name: "",
};

export default function NewGroupPage() {
  const navigate = useNavigate();
  const createGroupMut = useCreateGroupMutation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues,
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createGroupMut.mutateAsync({ name: data.name.trim() });
      toast.success("Grupo criado com sucesso!");
      navigate({ to: "/groups" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar grupo",
      );
    }
  };

  return (
    <Container size="md">
      <Lockup>
        <Lockup.Title>Novo grupo</Lockup.Title>
        <Lockup.Subtitle>Cadastre um grupo para organizar partidas.</Lockup.Subtitle>
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

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Criar grupo"}
        </Button>
      </form>
    </Container>
  );
}
