"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface ApproveButtonProps {
  loanId: string
}

export function ApproveButton({ loanId }: ApproveButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleApprove = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/loans/${loanId}/approve`, {
        method: "POST",
        body: JSON.stringify({
          approvedBy: "USER", // TODO: Obtener el usuario actual
        }),
      })

      if (!response.ok) {
        throw new Error("Error al aprobar el préstamo")
      }

      toast.success("Préstamo aprobado correctamente")
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error("Ocurrió un error al aprobar el préstamo")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      onClick={handleApprove}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Aprobando...
        </>
      ) : (
        "Aprobar Préstamo"
      )}
    </Button>
  )
} 