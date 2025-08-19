import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { LoginForm } from "@/app/(auth)/components/login-form";
import { authOptions } from "@/lib/auth-options";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session && session.user?.role) {
    console.log(session.user.role);
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/70  to-primary flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmYWZhZmEiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>

      {/* Login Container */}
      <div className="relative w-full max-w-md">
        {/* Logo Section */}

        {/* Login Form */}
        <LoginForm />

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-white">
            © 2025 Inversiones DJ. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
