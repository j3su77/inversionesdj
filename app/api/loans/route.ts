import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { addDays, addMonths, addWeeks } from "date-fns"

interface AccountSelection {
    accountId: string;
    amount: number;
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const {
            clientId,
            totalAmount,
            installments,
            interestRate,
            interestType,
            startDate,
            paymentFrequency,
            notes,
            accounts,
        } = body

        // Validar que se proporcionen cuentas
        if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
            return NextResponse.json(
                { message: "Debe seleccionar al menos una cuenta" },
                { status: 400 }
            )
        }

        // Validar que el total de las cuentas coincida con el monto del préstamo
        const totalAssigned = accounts.reduce((sum: number, acc: AccountSelection) => sum + acc.amount, 0)
        if (Math.abs(totalAssigned - totalAmount) > 0.01) {
            return NextResponse.json(
                { message: "El total asignado a las cuentas debe coincidir con el monto del préstamo" },
                { status: 400 }
            )
        }

        // Calcular la fecha de finalización basada en la frecuencia de pagos
        let endDate = new Date(startDate)
        
        // Calcular la fecha del próximo pago basándose en la frecuencia
        let nextPaymentDate = new Date(startDate)
        
        // El monto de la cuota base (capital) es el mismo para ambos tipos
        const baseFeeAmount = totalAmount / installments
        
        // Calcular el interés
        const interestAmount = totalAmount * (interestRate / 100)

        // Para interés fijo:
        // - Cada cuota incluye el pago de capital (baseFeeAmount)
        // - MÁS el interés completo (interestAmount)
        // Para interés decreciente:
        // - Comenzamos solo con el capital total
        // - El interés se calculará sobre el saldo en cada pago
        const fixedInterestAmount = interestType === 'FIXED' ? interestAmount : null
        const totalFeeAmount = interestType === 'FIXED' 
            ? baseFeeAmount + interestAmount // Cada cuota incluye capital + interés completo
            : baseFeeAmount // Solo capital, el interés se calcula sobre el saldo

        // El balance inicial es diferente para cada tipo
        const initialBalance = totalAmount

        // Calcular fecha de finalización basada en la frecuencia
        switch (paymentFrequency) {
            case "DAILY":
                endDate = addDays(endDate, installments)
                nextPaymentDate = addDays(nextPaymentDate, 1)
                break
            case "WEEKLY":
                endDate = addWeeks(endDate, installments)
                nextPaymentDate = addWeeks(nextPaymentDate, 1)
                break
            case "BIWEEKLY":
                endDate = addDays(endDate, installments * 15)
                nextPaymentDate = addDays(nextPaymentDate, 15)
                break
            case "MONTHLY":
                endDate = addMonths(endDate, installments)
                nextPaymentDate = addMonths(nextPaymentDate, 1)
                break
            case "QUARTERLY":
                endDate = addMonths(endDate, installments * 3)
                nextPaymentDate = addMonths(nextPaymentDate, 3)
                break
        }

        // Crear el préstamo usando una transacción
        const loan = await prisma.$transaction(async (tx) => {
            // 1. Verificar el cliente
            const client = await tx.client.findUnique({
                where: { id: clientId },
                include: {
                    loans: {
                        where: { status: "ACTIVE" },
                    },
                },
            })

            if (!client) {
                throw new Error("Cliente no encontrado")
            }

            if (client.isDisallowed) {
                throw new Error("Cliente no está habilitado para préstamos")
            }

            // 2. Verificar que todas las cuentas existan y estén activas
            for (const accountSelection of accounts) {
                const account = await tx.account.findUnique({
                    where: { 
                        id: accountSelection.accountId,
                        isActive: true,
                        deletedAt: null,
                    },
                })

                if (!account) {
                    throw new Error(`Cuenta con ID ${accountSelection.accountId} no encontrada o inactiva`)
                }
            }

            // 3. Crear el préstamo
            const loan = await tx.loan.create({
                data: {
                    loanNumber: String(Math.floor(1000000 + Math.random() * 9000000)),
                    clientId,
                    totalAmount,
                    installments,
                    remainingInstallments: installments,
                    balance: initialBalance,
                    interestRate,
                    interestType,
                    paymentFrequency,
                    feeAmount: totalFeeAmount,
                    fixedInterestAmount,
                    startDate: new Date(startDate),
                    endDate,
                    nextPaymentDate,
                    notes,
                    status: "PENDING",
                    currentInstallmentAmount: totalFeeAmount,
                },
            })

            // 4. Crear las relaciones LoanAccount (sin afectar saldos)
            for (const accountSelection of accounts) {
                // Crear la relación
                await tx.loanAccount.create({
                    data: {
                        loanId: loan.id,
                        accountId: accountSelection.accountId,
                        amount: accountSelection.amount,
                    },
                })
            }

            return loan
        })

        // Obtener el préstamo completo con sus relaciones para la respuesta
        const completeLoan = await prisma.loan.findUnique({
            where: { id: loan.id },
            include: {
                client: {
                    select: {
                        fullName: true,
                        identification: true,
                    },
                },
                loanAccounts: {
                    include: {
                        account: {
                            select: {
                                name: true,
                                number: true,
                                type: true,
                            },
                        },
                    },
                },
            },
        })

        return NextResponse.json(completeLoan)
    } catch (error) {
        console.error("[LOANS_POST]", error)
        
        // Devolver errores específicos
        if (error instanceof Error) {
            return NextResponse.json(
                { message: error.message },
                { status: 400 }
            )
        }
        
        return NextResponse.json(
            { message: "Error interno del servidor" },
            { status: 500 }
        )
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const clientId = searchParams.get("clientId")
        const status = searchParams.get("status")

        const whereClause: {
            clientId?: string;
            status?: "PENDING" | "ACTIVE" | "COMPLETED" | "DEFAULTED";
        } = {}

        if (clientId) {
            whereClause.clientId = clientId
        }

        if (status && ["PENDING", "ACTIVE", "COMPLETED", "DEFAULTED"].includes(status)) {
            whereClause.status = status as "PENDING" | "ACTIVE" | "COMPLETED" | "DEFAULTED"
        }

        const loans = await prisma.loan.findMany({
            where: whereClause,
            include: {
                client: {
                    select: {
                        fullName: true,
                        identification: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        })

        return NextResponse.json(loans)
    } catch (error) {
        console.error("[LOANS_GET]", error)
        return new NextResponse("Internal error", { status: 500 })
    }
} 