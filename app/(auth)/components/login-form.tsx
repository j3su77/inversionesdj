"use client";

import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

const formSchema = z.object({
  username: z.string().min(1, {
    message: "Usuario es requerido",
  }),
  password: z.string().min(5, {
    message: "Digite al menos 5 caracteres",
  }),
});

export function LoginForm() {
  const [viewPass, setViewPass] = useState(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "" },
  });

  const { isSubmitting, isValid } = form.formState;

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setViewPass(false);
    try {
      const signInResponse = await signIn("credentials", {
        username: values.username,
        password: values.password,
        redirect: false,
      });

      if (!signInResponse || signInResponse.ok !== true) {
        return toast.error("Usuario y/o Contraseña incorrectos", {
          description: "Por favor revisa los datos ingresados",
          position: "bottom-center",
        });
      }

      router.refresh();
      toast.success("Bienvenido");
    } catch (error) {
      toast.error("Algo salió mal");
      console.log("error", error);
    }
  };

  return (
    <Card className="backdrop-blur-sm bg-card/50 rounded-md">
      <CardContent className="pt-8">
        <div className="mb-8 text-center">
          <h1 className="text-primary text-2xl font-semibold tracking-tight mb-2">
            Iniciar Sesión
          </h1>
          <p className="text-sm text-muted-foreground">
            Ingresa tus credenciales para continuar
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      className="bg-background/50"
                      disabled={isSubmitting}
                      placeholder="Usuario"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="relative">
                  <FormControl>
                    <Input
                      type={viewPass ? "text" : "password"}
                      className="bg-background/50"
                      disabled={isSubmitting}
                      placeholder="Contraseña"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  {field.value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setViewPass(!viewPass)}
                    >
                      {!viewPass ? (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              disabled={!isValid || isSubmitting}
              type="submit"
              className="w-full"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <LogIn className="w-4 h-4 mr-2" />
              )}
              Iniciar Sesión
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
