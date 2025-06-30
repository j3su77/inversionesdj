
import {
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ClientStatusToggle = ({ control, name = "isDisallowed" }: {control: any; name?: string}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-card w-fit">
          <FormControl>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                {field.value ? "Restringido" : "Activo"}
              </span>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                className="data-[state=checked]:bg-destructive"
              />
            </div>
          </FormControl>
        </FormItem>
      )}
    />
  );
};
