import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@poker-hub/design-system";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useLocationsQuery,
  useCreateLocationMutation,
  type LocationWithGameCount,
} from "@/api/hooks";
import { toast } from "sonner";

interface LocationComboboxProps {
  value: string | null;
  onChange: (locationId: string | null) => void;
  className?: string;
}

export function LocationCombobox({
  value,
  onChange,
  className,
}: LocationComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const { data: locations = [] } = useLocationsQuery();
  const createLocationMut = useCreateLocationMutation();

  const selectedLocation = locations.find((loc) => loc.id === value);

  const filteredLocations = locations.filter((loc) =>
    loc.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const exactMatch = locations.find(
    (loc) => loc.name.toLowerCase() === searchValue.toLowerCase()
  );

  const showCreateOption = searchValue.trim() && !exactMatch;

  const handleCreateLocation = async () => {
    try {
      const newLocation = await createLocationMut.mutateAsync({
        name: searchValue.trim(),
      });
      onChange(newLocation.id);
      setOpen(false);
      setSearchValue("");
      toast.success(`Local "${newLocation.name}" criado!`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar local"
      );
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-card font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {selectedLocation?.name ?? "Selecione um local..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar local..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredLocations.length === 0 && !showCreateOption && (
              <CommandEmpty>Nenhum local encontrado.</CommandEmpty>
            )}
            <CommandGroup>
              {filteredLocations.map((location) => (
                <CommandItem
                  key={location.id}
                  value={location.id}
                  onSelect={() => {
                    onChange(location.id === value ? null : location.id);
                    setOpen(false);
                    setSearchValue("");
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === location.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {location.name}
                </CommandItem>
              ))}
              {showCreateOption && (
                <CommandItem
                  onSelect={handleCreateLocation}
                  disabled={createLocationMut.isPending}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createLocationMut.isPending
                    ? "Criando..."
                    : `Criar "${searchValue.trim()}"`}
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
