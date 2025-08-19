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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MainLogo } from "@/components/main-logo";

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
    <Card className="bg-white backdrop-blur-sm shadow-xl border-0 rounded-sm overflow-hidden">
      <CardHeader className="p-4">
        <div className="text-center mb-2">
          <MainLogo width={150} />
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input
                          className="h-12 pl-4 pr-4 bg-gray-50 border-gray-200 rounded-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                          disabled={isSubmitting}
                          placeholder="Nombre de usuario"
                          autoComplete="username"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500 text-sm mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={viewPass ? "text" : "password"}
                          className="h-12 pl-4 pr-12 bg-gray-50 border-gray-200 rounded-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
                          disabled={isSubmitting}
                          placeholder="Contraseña"
                          autoComplete="current-password"
                          {...field}
                        />
                        {field.value && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={() => setViewPass(!viewPass)}
                          >
                            {!viewPass ? (
                              <Eye className="w-4 h-4 text-gray-400" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-gray-400" />
                            )}
                          </Button>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500 text-sm mt-1" />
                  </FormItem>
                )}
              />
            </div>

            <Button
              disabled={!isValid || isSubmitting}
              type="submit"
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-sm transition-all duration-200 transform hover:scale-[1.02] disabled:hover:scale-100 disabled:opacity-50 shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 mr-2" />
                  Iniciar Sesión
                </>
              )}
            </Button>
          </form>
        </Form>

        {/* Additional Security Info */}
        <div className="mt-6 pt-6 border-t border-gray-100"></div>
      </CardContent>
    </Card>
  );
}
