import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { LoginForm } from "@/app/(auth)/components/login-form";
import { authOptions } from "@/lib/auth-options";
import { MainLogo } from "@/components/main-logo";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session && session.user?.role) {
    console.log(session.user.role);
    redirect("/dashboard");
  }

  return (
    <div className="bg-emerald-800 h-screen w-full">
      <div className="relative p-1 border-b h-[45px] max-h-[70px] w-full bg-white shadow-sm flex items-center">
        <div className="mx-auto w-full max-w-[1500px] mt-1">
          <div className="mx-3 flex items-center justify-between">
            <div className="p-2 flex gap-1">
              <MainLogo />
            </div>
          </div>
        </div>
      </div>
      <div className="container w-full pt-14 h-fit mx-auto max-w-[500px]">
        <LoginForm />
      </div>
    </div>
  );
}
