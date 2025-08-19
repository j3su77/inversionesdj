"use server";
import { db } from "@/lib/db";
import { Prisma, Client, ClientStatus, LoanStatus } from "@prisma/client";

export const getClientById = async (id: string): Promise<Client | null> => {
    return await db.client.findUnique({
        where: { id },
        include: {
            loans: {
                orderBy: {
                    createdAt: 'desc'
                }
            }
        }
    });
};

export const getClientBySearch = async (query: string): Promise<Client[]> => {
    // Validar entrada
    if (!query || query.trim() === "") return [];

    const trimmedQuery = query.trim();

    // Intentar parsear como número para búsqueda por identification
    const idNumber = parseInt(trimmedQuery);

    // Construir la consulta OR para buscar en ambos campos
    return await db.client.findMany({
        where: {
            OR: [
                // Buscar por nombre
                {
                    fullName: {
                        contains: trimmedQuery
                    }
                },
                // Buscar por identification (solo si es un número válido)
                ...(isNaN(idNumber) ? [] : [{
                    identification: {
                        equals: idNumber
                    }
                }])
            ],
            deletedAt: null, // Solo clientes no eliminados
        },
        include: {
            loans: {
                orderBy: {
                    createdAt: 'desc'
                }
            }
        },
        take: 10, // Limitar resultados
    });
};

export type ClientStatusFilter = "active" | "inactive" | "blocked" | "all";

export const getClientsByStatus = async (status: ClientStatusFilter): Promise<Client[]> => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const baseWhere: Prisma.ClientWhereInput = {
        deletedAt: null,
    };

    // Configurar los filtros según el estado
    switch (status) {
        case "active":
            baseWhere.AND = [
                { isDisallowed: false },
                {
                    OR: [
                        // Clientes con préstamos activos o pendientes
                        {
                            loans: {
                                some: {
                                    status: { in: [LoanStatus.ACTIVE, LoanStatus.PENDING] }
                                }
                            }
                        },
                        // Clientes con préstamos creados en los últimos 365 días
                        {
                            loans: {
                                some: {
                                    createdAt: { gte: oneYearAgo }
                                }
                            }
                        },
                        // Clientes registrados en los últimos 365 días (sin préstamos o con préstamos antiguos)
                        {
                            AND: [
                                { createdAt: { gte: oneYearAgo } },
                                {
                                    OR: [
                                        { loans: { none: {} } },
                                        {
                                            loans: {
                                                every: {
                                                    createdAt: { lt: oneYearAgo }
                                                }
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ];
            break;

        case "inactive":
            baseWhere.AND = [
                { isDisallowed: false },
                {
                    // Cliente registrado hace más de 365 días
                    createdAt: { lt: oneYearAgo }
                },
                {
                    OR: [
                        // Sin préstamos
                        {
                            loans: { none: {} }
                        },
                        // Todos los préstamos fueron creados hace más de 365 días y no están activos
                        {
                            loans: {
                                every: {
                                    AND: [
                                        { createdAt: { lt: oneYearAgo } },
                                        { status: { notIn: [LoanStatus.ACTIVE, LoanStatus.PENDING] } }
                                    ]
                                }
                            }
                        }
                    ]
                }
            ];
            break;

        case "blocked":
            baseWhere.OR = [
                { status: ClientStatus.BLOCKED },
                { isDisallowed: true }
            ];
            break;

        // "all" no necesita filtros adicionales
    }

    return await db.client.findMany({
        where: baseWhere,
        include: {
            loans: {
                orderBy: {
                    createdAt: 'desc'
                },
                include: {
                    payments: {
                        orderBy: {
                            paymentDate: 'desc'
                        },
                        take: 1
                    }
                }
            },
            _count: {
                select: {
                    loans: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
};

export const getClientsWithHighestDebt = async (limit: number = 10) => {
    const clients = await db.client.findMany({
        where: {
            deletedAt: null,
            loans: {
                some: {
                    status: { in: [LoanStatus.ACTIVE, LoanStatus.PENDING] },
                    balance: { gt: 0 }
                }
            }
        },
        include: {
            loans: {
                where: {
                    status: { in: [LoanStatus.ACTIVE, LoanStatus.PENDING] },
                    balance: { gt: 0 }
                },
                select: {
                    id: true,
                    balance: true,
                    totalAmount: true,
                    nextPaymentDate: true,
                    paymentFrequency: true,
                    currentInstallmentAmount: true,
                }
            }
        }
    });

    // Calcular la deuda total de cada cliente y ordenar
    const clientsWithDebt = clients.map(client => {
        const totalDebt = client.loans.reduce((sum, loan) => sum + loan.balance, 0);
        const totalLoans = client.loans.length;
        const nextPaymentDate = client.loans.reduce((earliest, loan) => {
            if (!loan.nextPaymentDate) return earliest;
            if (!earliest) return loan.nextPaymentDate;
            return loan.nextPaymentDate < earliest ? loan.nextPaymentDate : earliest;
        }, null as Date | null);

        return {
            id: client.id,
            fullName: client.fullName,
            identification: client.identification,
            totalDebt,
            totalLoans,
            nextPaymentDate,
            loans: client.loans
        };
    });

    // Ordenar por deuda total (mayor a menor) y limitar resultados
    return clientsWithDebt
        .sort((a, b) => b.totalDebt - a.totalDebt)
        .slice(0, limit);
};

export const updateClientStatus = async (clientId: string, isDisallowed: boolean) => {
    try {
        const updatedClient = await db.client.update({
            where: { id: clientId },
            data: { isDisallowed },
        });
        
        return {
            success: true,
            client: updatedClient,
            message: isDisallowed ? "Cliente restringido exitosamente" : "Cliente activado exitosamente"
        };
    } catch (error) {
        console.error("[UPDATE_CLIENT_STATUS]", error);
        return {
            success: false,
            error: "Error al actualizar el estado del cliente"
        };
    }
};
